#!/usr/bin/env python3
"""Runs the typical operations of this project through support-python's DevopsCli.

The app has no build step, so a release finalizes the version files and the changelog, tags, and publishes.
Install the tools once, as docs/devops.md describes: Node.js with npm, and a .venv from scripts/requirements.txt.

Usage:
  python scripts/devops.py lint | format | check | build | clean
  python scripts/devops.py test [--slow] [SELECTION...]
  python scripts/devops.py e2e
  python scripts/devops.py versions [VERSION] [--dry-run]
  python scripts/devops.py server start [--background] [--port PORT]
  python scripts/devops.py server stop [--port PORT]
  python scripts/devops.py release [VERSION] [--dry-run] [--skip-checks] [--skip-github-release] [--yes]
                                   [--backend-dir PATH]
  python scripts/devops.py help [--verbose] | version

`release` follows docs/devops.md, Release Procedure, as a Project.release override. It never pushes the todos
server repository. `server` serves src/ with scripts/serve.mjs; it is the dev server of the web app, not the backend.
"""

from __future__ import annotations

import argparse
import re
import shutil
import socket
import subprocess
import sys
import time
from collections.abc import Sequence
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VENV_DIR = REPO_ROOT / ".venv"
VENV_PYTHON = VENV_DIR / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")

if __name__ == "__main__" and VENV_PYTHON.is_file() and Path(sys.prefix).resolve() != VENV_DIR.resolve():
    sys.exit(subprocess.run([str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]], check=False).returncode)

try:
    from support_python.devops import DevopsCli, NodeProject
except ImportError:
    print(
        "[ERROR] support-python is not installed. Create .venv and install scripts/requirements.txt into it,\n"
        "        as docs/devops.md, Prerequisites, describes.",
        file=sys.stderr,
    )
    raise SystemExit(1) from None

DESCRIPTION = (
    "Runs the lint, format, test, e2e, build, check, clean, versions, server, and release operations of this project."
)
COPYRIGHT = "Copyright (c) Giovanni Pellicciotta"
SERVE_SCRIPT = "scripts/serve.mjs"
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8080
SERVER_STATE_DIR = "work"
SERVER_WAIT_SECONDS = 10.0
SERVER_OPERATIONS = ["start", "stop"]
SEMVER = re.compile(r"\d+\.\d+\.\d+")
HEADING = re.compile(r"^## v(\d+\.\d+\.\d+)(-pre)?(?=[ \t\r\n]|$)([^\r\n]*)", re.MULTILINE)
VERSION_JS = "src/js/version.js"
SERVICE_WORKER = "src/service-worker.js"
SW_MANIFEST = "scripts/sw-precache-hashes.json"
SW_CHECK = "scripts/check-sw-version.mjs"
DESIGN_CHECK = "src/vendor/design/bin/check.mjs"
PYTHON_DIRS = ["scripts", "tests"]
VERSION_FILES = ["CHANGELOG.md", "package.json", "package-lock.json", VERSION_JS, SERVICE_WORKER, SW_MANIFEST]
# The text each release rewrite replaces; check_rewritable proves they match before anything is written.
PACKAGE_PATTERN = r'^(  "version":\s*")[^"]+(")'
LOCK_PATTERN = r'("name":\s*"todos-webapp",\s*"version":\s*")[^"]+(")'
VERSION_PATTERN = r"(export const VERSION = ')[^']*(';)"
BUILD_DATE_PATTERN = r"(export const BUILD_DATE = ')[^']*(';)"
WORKER_PATTERN = r"(const VERSION = ')[^']+(';)"
PIN_PATTERN = r"^todosWebappVersion=[^\r\n]*"
INTERRUPTED = (
    "Interrupted. Check git status and git ls-remote origin: if the tag is on origin, the release is published."
)


class ReleaseError(Exception):
    """A release precondition or step, or a server operation, failed."""


def today_iso() -> str:
    """Return today's date as YYYY-MM-DD."""
    return date.today().isoformat()


# --- Files and processes -----------------------------------------------------------------------


def read_text(path: Path) -> str:
    """Read a UTF-8 file without translating its line endings."""
    with open(path, encoding="utf-8", newline="") as handle:
        return handle.read()


def write_text(path: Path, text: str) -> None:
    """Write a UTF-8 file without translating its line endings."""
    with open(path, "w", encoding="utf-8", newline="") as handle:
        handle.write(text)


def git(root: Path, *args: str) -> str:
    """Run git in a folder and return its trimmed output; raise ReleaseError when it fails."""
    result = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, encoding="utf-8", check=False)
    if result.returncode != 0:
        raise ReleaseError(f"git {' '.join(args)} failed: {(result.stderr or result.stdout).strip()}")
    return result.stdout.strip()


def run(command: list[str], root: Path) -> bool:
    """Run one release command in a folder, echoing it first. Return whether it succeeded."""
    print(f"[*] {' '.join(command)}", flush=True)
    return subprocess.run(command, cwd=root, check=False).returncode == 0


def tool(name: str) -> str:
    """Return the path of a required tool; raise ReleaseError when it is missing."""
    path = shutil.which(name)
    if path is None:
        raise ReleaseError(f"'{name}' is not installed or not on PATH.")
    return path


def ruff(*args: str) -> list[str]:
    """Return a Ruff command on the scripts and the tests, run by this Python."""
    return [sys.executable, "-m", "ruff", *args, *PYTHON_DIRS]


def pytest_command(*selection: str) -> list[str]:
    """Return the pytest command, on every test or on a selection."""
    return [sys.executable, "-m", "pytest", "-q", *(selection or ["tests"])]


def check_commands() -> list[list[str]]:
    """Return every check: the Pages test job steps, then the Python checks."""
    npm = tool("npm")
    return [
        [tool("node"), SW_CHECK],
        [tool("node"), DESIGN_CHECK],
        [npm, "test"],
        [npm, "run", "lint"],
        [npm, "run", "test:e2e"],
        ruff("check"),
        ruff("format", "--check"),
        pytest_command(),
    ]


def run_all(commands: list[list[str]], root: Path) -> bool:
    """Run the release quality checks in order and stop at the first failure."""
    return all(run(command, root) for command in commands)


def is_python_selection(selection: Sequence[str]) -> bool:
    """Return whether a test selection names a Python test file, so it belongs to pytest."""
    return any(item.endswith(".py") or ".py::" in item for item in selection)


# --- Project -----------------------------------------------------------------------------------


class TodosProject(NodeProject):
    """The web app: npm scripts for JavaScript, Ruff and pytest for the Python scripts, and its own release."""

    test_selection_example = "tests/test_devops.py -k lint"

    def __init__(self, root: Path, **kwargs) -> None:
        """Bind the project to its root; release_target and backend_dir carry the extra release options."""
        super().__init__(root, **kwargs)
        self.release_target: str | None = None
        self.backend_dir: str | None = None

    def lint(self) -> bool:
        """Run ESLint, then Ruff check and Ruff format check."""
        return (
            self._npm_script("lint") and self.run_command(ruff("check")) and self.run_command(ruff("format", "--check"))
        )

    def format(self) -> bool:
        """Fix Ruff findings, format the Python sources, then let ESLint fix what it can."""
        return (
            self.run_command(ruff("check", "--fix"))
            and self.run_command(ruff("format"))
            and self._npm("run", "lint", "--", "--fix")
        )

    def test(self, selection: Sequence[str] = ()) -> bool:
        """Run Vitest, then pytest; a selection goes to pytest when it names a .py file, else to Vitest."""
        if not selection:
            return self._npm("test") and self.run_command(pytest_command())
        if is_python_selection(selection):
            return self.run_command(pytest_command(*selection))
        return self._npm("test", "--", *selection)

    def test_slow(self, selection: Sequence[str] = ()) -> bool:
        """Run the Playwright end-to-end tests, or a selection of them."""
        return self._npm("run", "test:e2e", *(["--", *selection] if selection else []))

    def build(self) -> bool:
        """Do nothing: src/ is the web root and the deployed folder."""
        self.logger.info("The app has no build step; src/ is deployed as it is.")
        return True

    def release_assets(self) -> list[Path]:
        """Return no assets: a release attaches nothing."""
        return []

    def check(self) -> bool:
        """Run what the Pages test job runs, then the Python checks, stopping at the first failure."""
        try:
            commands = check_commands()
        except ReleaseError as error:
            self.logger.error(str(error))
            return False
        return all(self.run_command(command) for command in commands)

    def action_summaries(self) -> dict[str, str]:
        """Describe the actions as this project runs them."""
        return {
            "lint": "run ESLint, then Ruff check and Ruff format check",
            "format": "fix Ruff findings, format the Python sources, and run ESLint --fix",
            "test": "run Vitest, then pytest; --slow runs the Playwright tests",
            "build": "do nothing: the app has no build step",
            "check": "run the Pages test job checks, then Ruff and pytest",
            "release": "cut a release: version files, service worker, tag, atomic push, plan push, GitHub release",
        }

    def release(
        self,
        *,
        dry_run: bool = False,
        assume_yes: bool = False,
        skip_checks: bool = False,
        skip_github_release: bool = False,
    ) -> bool:
        """Cut the release with the todos release flow instead of ReleasePipeline; return whether it succeeded."""
        opts = argparse.Namespace(
            release_version=self.release_target,
            dry_run=dry_run,
            skip_checks=skip_checks,
            yes=assume_yes,
            skip_github_release=skip_github_release,
            backend_dir=self.backend_dir,
        )
        try:
            return cut_release(self.root, opts) == 0
        except (ReleaseError, OSError) as error:
            self.logger.error(str(error))
            return False
        except KeyboardInterrupt:
            self.logger.error(INTERRUPTED)
            return False


# --- Dev server --------------------------------------------------------------------------------


def server_files(state_dir: Path) -> tuple[Path, Path, Path]:
    """Return the pid file, the stop file, and the log file of the dev server."""
    return state_dir / "server.pid", state_dir / "server.stop", state_dir / "server.log"


def server_listening(port: int = SERVER_PORT) -> bool:
    """Return whether something accepts connections on the dev server port."""
    try:
        with socket.create_connection((SERVER_HOST, port), timeout=0.5):
            return True
    except OSError:
        return False


def server_pid(pid_file: Path) -> str:
    """Return the process ID in the pid file, or an empty string when there is none."""
    try:
        return read_text(pid_file).strip()
    except OSError:
        return ""


def wait_until(condition, seconds: float) -> bool:
    """Poll a condition every 100 ms until it holds or the time is up."""
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if condition():
            return True
        time.sleep(0.1)
    return condition()


def server_start(
    root: Path,
    background: bool,
    port: int = SERVER_PORT,
    state_dir: Path | None = None,
) -> int:
    """Start the dev server in the foreground, or detached with --background. Return the exit code."""
    pid_file, stop_file, log_file = server_files(state_dir or root / SERVER_STATE_DIR)
    url = f"http://{SERVER_HOST}:{port}/"
    if server_listening(port):
        print(f"The server is already running at {url} (PID {server_pid(pid_file) or 'unknown'}).")
        return 1
    pid_file.parent.mkdir(parents=True, exist_ok=True)
    stop_file.unlink(missing_ok=True)
    command = [tool("node"), str(root / SERVE_SCRIPT), "--port", str(port), "--host", SERVER_HOST]
    command += ["--pid-file", str(pid_file), "--stop-file", str(stop_file)]
    if not background:
        print(f"[*] {' '.join(command)}", flush=True)
        try:
            return subprocess.run(command, cwd=root, check=False).returncode
        except KeyboardInterrupt:
            return 0
    print(f"[*] {' '.join(command)} > {log_file}", flush=True)
    options = {"start_new_session": True}
    if sys.platform == "win32":
        options = {"creationflags": subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP}
    with open(log_file, "wb") as log:
        process = subprocess.Popen(
            command, cwd=root, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, **options
        )
    if not wait_until(lambda: server_listening(port) and bool(server_pid(pid_file)), SERVER_WAIT_SECONDS):
        raise ReleaseError(f"the server did not start within {SERVER_WAIT_SECONDS:.0f} s; see {log_file}")
    print(f"Server started in the background at {url} (PID {server_pid(pid_file) or process.pid}); log: {log_file}")
    print("Stop it with: python scripts/devops.py server stop")
    return 0


def server_stop(root: Path, port: int = SERVER_PORT, state_dir: Path | None = None) -> int:
    """Ask the dev server to exit through its stop file and wait for it. Return the exit code.

    The command never kills the process. When the server does not exit, it names the PID for manual handling.
    """
    pid_file, stop_file, _ = server_files(state_dir or root / SERVER_STATE_DIR)
    pid = server_pid(pid_file) or "unknown"
    if not server_listening(port):
        pid_file.unlink(missing_ok=True)
        stop_file.unlink(missing_ok=True)
        print("The server is not running.")
        return 0
    stop_file.parent.mkdir(parents=True, exist_ok=True)
    write_text(stop_file, "stop\n")
    if not wait_until(lambda: not server_listening(port), SERVER_WAIT_SECONDS):
        stop_file.unlink(missing_ok=True)
        raise ReleaseError(
            f"the server (PID {pid}) did not stop within {SERVER_WAIT_SECONDS:.0f} s; "
            "end it with processes kill from support.python"
        )
    print(f"Server stopped (PID {pid}).")
    return 0


# --- Versions and the changelog ----------------------------------------------------------------


def parse_version(text: str) -> tuple[int, int, int]:
    """Parse a plain MAJOR.MINOR.PATCH version; raise ReleaseError for anything else."""
    if not SEMVER.fullmatch(text):
        raise ReleaseError(f"'{text}' is not a version like 1.2.3, without a v prefix or suffix.")
    major, minor, patch = (int(part) for part in text.split("."))
    return major, minor, patch


def next_patch(version: str) -> str:
    """Return the version with its patch number raised by one."""
    major, minor, patch = parse_version(version)
    return f"{major}.{minor}.{patch + 1}"


def latest_released(changelog: str) -> str | None:
    """Return the highest version of the changelog headings that are not -pre."""
    released = [match.group(1) for match in HEADING.finditer(changelog) if not match.group(2)]
    return max(released, key=parse_version, default=None)


def top_pre_version(changelog: str) -> str:
    """Return the version of the single -pre heading, which must be the first heading."""
    headings = list(HEADING.finditer(changelog))
    pre = [match for match in headings if match.group(2)]
    if len(pre) != 1 or headings[0] is not pre[0]:
        raise ReleaseError("CHANGELOG.md must start with exactly one '-pre' heading; there is none to release.")
    return pre[0].group(1)


def finalize_changelog(changelog: str, version: str, today: str) -> str:
    """Rename the single -pre heading to the released version, leaving every other entry untouched."""
    parse_version(version)
    top_pre_version(changelog)
    last = latest_released(changelog)
    if last is not None and parse_version(version) <= parse_version(last):
        raise ReleaseError(f"Version {version} is not above the last release, {last}.")
    if not extract_release_notes(changelog, top_pre_version(changelog)):
        raise ReleaseError("The -pre entry of CHANGELOG.md has no bullets to release.")
    match = next(match for match in HEADING.finditer(changelog) if match.group(2))
    return changelog[: match.start()] + f"## v{version} [released: {today}]" + changelog[match.end() :]


def open_next_heading(changelog: str, next_version: str) -> str:
    """Put an empty -pre heading for the next version above the first heading."""
    newline = "\r\n" if "\r\n" in changelog else "\n"
    first = HEADING.search(changelog)
    if first is None:
        raise ReleaseError("CHANGELOG.md has no version heading.")
    return changelog[: first.start()] + f"## v{next_version}-pre{newline}{newline}" + changelog[first.start() :]


def extract_release_notes(changelog: str, version: str) -> str:
    """Return the bullets under the heading of a version, up to the next heading."""
    for match in HEADING.finditer(changelog):
        if match.group(1) == version:
            following = HEADING.search(changelog, match.end())
            end = following.start() if following else len(changelog)
            return changelog[match.end() : end].strip()
    raise ReleaseError(f"CHANGELOG.md has no heading for v{version}.")


def replace_once(path: Path, pattern: str, replacement: str, count: int = 1) -> None:
    """Replace a pattern in a file; raise ReleaseError unless it matches at least once."""
    text = read_text(path)
    updated, matches = re.subn(pattern, replacement, text, count=count, flags=re.MULTILINE)
    if matches == 0:
        raise ReleaseError(f"{path.name} has no text matching {pattern}.")
    write_text(path, updated)


def set_package_versions(root: Path, version: str) -> None:
    """Set the version in package.json and in the root entries of package-lock.json."""
    replace_once(root / "package.json", PACKAGE_PATTERN, rf"\g<1>{version}\g<2>")
    lock = root / "package-lock.json"
    if lock.exists():
        replace_once(lock, LOCK_PATTERN, rf"\g<1>{version}\g<2>", count=0)


def set_version_js(root: Path, version: str, build_date: str) -> None:
    """Set VERSION and BUILD_DATE, which Settings shows under About."""
    path = root / VERSION_JS
    replace_once(path, VERSION_PATTERN, rf"\g<1>{version}\g<2>")
    replace_once(path, BUILD_DATE_PATTERN, rf"\g<1>{build_date}\g<2>")


def next_sw_version(current: str, today: str) -> str:
    """Return the next service worker VERSION: today's date and a counter."""
    match = re.fullmatch(rf"{re.escape(today)}\.(\d+)", current)
    return f"{today}.{int(match.group(1)) + 1}" if match else f"{today}.1"


def bump_service_worker(root: Path, today: str) -> None:
    """Bump the service worker VERSION and rewrite the hash manifest through check-sw-version.mjs."""
    path = root / SERVICE_WORKER
    found = re.search(r"const VERSION = '([^']+)';", read_text(path))
    if found is None:
        raise ReleaseError("service-worker.js has no VERSION line.")
    replace_once(path, WORKER_PATTERN, rf"\g<1>{next_sw_version(found.group(1), today)}\g<2>")
    if not run([tool("node"), SW_CHECK, "--update"], root):
        raise ReleaseError("Rewriting the service worker hash manifest failed.")


def check_rewritable(root: Path) -> None:
    """Prove that every file the release rewrites exists and holds the text to replace; write nothing."""
    targets = [
        ("package.json", PACKAGE_PATTERN, True),
        ("package-lock.json", LOCK_PATTERN, False),
        (VERSION_JS, VERSION_PATTERN, True),
        (VERSION_JS, BUILD_DATE_PATTERN, True),
        (SERVICE_WORKER, WORKER_PATTERN, True),
    ]
    for name, pattern, required in targets:
        path = root / name
        if not path.exists():
            if required:
                raise ReleaseError(f"{name} does not exist; the release cannot rewrite it.")
            continue
        if not re.search(pattern, read_text(path), re.MULTILINE):
            raise ReleaseError(f"{name} has no text matching {pattern}; the release cannot rewrite it.")


# --- Release -----------------------------------------------------------------------------------


def ensure_not_behind(root: Path) -> None:
    """Fetch main and the tags; raise ReleaseError when main is behind origin/main."""
    git(root, "fetch", "origin", "main", "--tags")
    behind = int(git(root, "rev-list", "--count", "HEAD..origin/main"))
    if behind:
        raise ReleaseError(f"main is {behind} commit(s) behind origin/main; pull first.")


def check_plan_branch(root: Path) -> None:
    """Raise ReleaseError when the local plan branch is behind origin; warn about unpublished plan changes."""
    if not git(root, "branch", "--list", "plan"):
        return
    if git(root, "ls-remote", "--heads", "origin", "refs/heads/plan"):
        git(root, "fetch", "origin", "plan")
        behind = int(git(root, "rev-list", "--count", "plan..origin/plan"))
        if behind:
            raise ReleaseError(f"The plan branch is {behind} commit(s) behind origin/plan; update it first.")
    store = root / ".plan"
    if store.exists() and git(store, "status", "--porcelain"):
        print("[!] .plan has uncommitted changes; the release does not publish them.")


def preflight(root: Path, version: str) -> None:
    """Check that main is clean, current, and free of the release tag; raise ReleaseError if not."""
    if git(root, "branch", "--show-current") != "main":
        raise ReleaseError("Releases are cut from the 'main' branch.")
    if git(root, "status", "--porcelain"):
        raise ReleaseError("There are uncommitted changes; commit them before releasing.")
    ensure_not_behind(root)
    tag = f"v{version}"
    if git(root, "tag", "--list", tag) or git(root, "ls-remote", "--tags", "origin", f"refs/tags/{tag}"):
        raise ReleaseError(f"The tag {tag} already exists.")
    check_plan_branch(root)


def check_backend(backend_dir: Path) -> Path:
    """Check that the todos server repository can take the pin commit; return its gradle.properties."""
    gradle = backend_dir / "gradle.properties"
    if not gradle.exists():
        raise ReleaseError(f"{gradle} does not exist; --backend-dir must name the todos repository.")
    if git(backend_dir, "status", "--porcelain"):
        raise ReleaseError(f"The backend repository {backend_dir} has uncommitted changes; commit them first.")
    if not git(backend_dir, "branch", "--show-current"):
        raise ReleaseError(
            f"The backend repository {backend_dir} has no branch checked out (detached HEAD); check one out first."
        )
    if not re.search(PIN_PATTERN, read_text(gradle), re.MULTILINE):
        raise ReleaseError("gradle.properties of the backend has no todosWebappVersion line.")
    return gradle


def update_backend_pin(backend_dir: Path, version: str) -> bool:
    """Set todosWebappVersion in the todos repository and commit it locally; return whether it changed.

    It never pushes or deploys. A failed commit restores gradle.properties.
    """
    gradle = check_backend(backend_dir)
    if re.search(rf"^todosWebappVersion={re.escape(version)}\s*$", read_text(gradle), re.MULTILINE):
        return False
    replace_once(gradle, PIN_PATTERN, f"todosWebappVersion={version}")
    try:
        git(backend_dir, "add", "gradle.properties")
        git(backend_dir, "commit", "-m", f"Pinned todos.webapp v{version}.")
    except ReleaseError:
        git(backend_dir, "restore", "--source=HEAD", "--staged", "--worktree", "--", "gradle.properties")
        raise
    return True


def verify_service_worker(root: Path) -> bool:
    """Run the service worker version check."""
    return run([tool("node"), SW_CHECK], root)


def verify_release_files(root: Path, skip_checks: bool) -> bool:
    """Verify the edited release files: the service worker check, then the unit tests unless skipped."""
    return verify_service_worker(root) and (skip_checks or run([tool("npm"), "test"], root))


def existing(root: Path, names: list[str]) -> list[str]:
    """Keep the names of the files that exist under a folder."""
    return [name for name in names if (root / name).exists()]


def restore(root: Path, names: list[str]) -> None:
    """Restore edited files, staged or not, from the last commit."""
    git(root, "restore", "--source=HEAD", "--staged", "--worktree", "--", *existing(root, names))


def local_state(root: Path, tag: str, start_sha: str) -> str:
    """Describe what a failed release left in the local repository, and how to undo it."""
    if git(root, "rev-parse", "HEAD") == start_sha:
        return "Nothing was committed or pushed."
    tagged = bool(git(root, "tag", "--list", tag))
    undo = (f"git tag -d {tag}; " if tagged else "") + f"git reset --hard {start_sha}"
    return f"Local commits{' and the tag ' + tag if tagged else ''} exist and nothing was pushed. To undo them: {undo}"


def edit_phase(root: Path, label: str, tag: str, start_sha: str, action) -> None:
    """Run one editing phase; on any failure restore the edited files and say what state is left."""
    try:
        action()
    except (Exception, KeyboardInterrupt) as error:
        try:
            restore(root, VERSION_FILES)
            restored = "The edited files were restored."
        except ReleaseError as restore_error:
            restored = f"Restoring the edited files failed too ({restore_error}); check git status."
        reason = str(error) or type(error).__name__
        raise ReleaseError(f"{label} failed: {reason}. {restored} {local_state(root, tag, start_sha)}") from error


def confirm(question: str) -> bool:
    """Ask a yes or no question; a closed input or an interrupt counts as no."""
    try:
        return input(question).strip().lower() in {"y", "yes"}
    except (EOFError, KeyboardInterrupt):
        print()
        return False


def describe_plan(root: Path, version: str, next_version: str, opts) -> list[str]:
    """Return the lines that tell the user what a release will do, with the real commands."""
    tag = f"v{version}"
    unpublished = git(root, "log", "--oneline", "origin/main..HEAD").splitlines()
    lines = [
        f"Release         : {tag}, dated {today_iso()}",
        f"Next version    : v{next_version}-pre",
        f"Files           : {', '.join(existing(root, VERSION_FILES))}",
        f"Checks          : {'skipped' if opts.skip_checks else 'ran: service worker, unit, lint, e2e, Ruff, pytest'}",
        "Local commands, after the question:",
        f'  git commit -m "Released {tag}."',
        f'  git tag -a {tag} -m "Released {tag}."',
        f'  git commit -m "Opened v{next_version}-pre development after releasing {tag}."',
        "Commands that publish:",
        f"  git push --atomic origin main {tag}",
    ]
    if git(root, "branch", "--list", "plan"):
        lines.append("  git push origin plan")
    notes = '"<the changelog entry of ' + tag + '>"'
    lines.append(
        "  (no GitHub release)"
        if opts.skip_github_release
        else f"  gh release create {tag} --title {tag} --notes {notes}"
    )
    if unpublished:
        lines.append(f"Also published  : {len(unpublished)} commit(s) not yet on origin/main")
        lines.extend(f"  {line}" for line in unpublished[:10])
    if opts.backend_dir:
        lines.append(
            f"Backend pin     : todosWebappVersion={version} in {opts.backend_dir}; committed locally, never pushed or deployed"
        )
    return lines


def publish(root: Path, opts, version: str, notes: str, start_sha: str) -> int:
    """Push and register the release. Return 0, or 1 when a step after the push is left for the user."""
    tag = f"v{version}"
    try:
        ensure_not_behind(root)
        git(root, "push", "--atomic", "origin", "main", tag)
    except ReleaseError as error:
        raise ReleaseError(
            f"Publishing failed and nothing reached origin: {error}. {local_state(root, tag, start_sha)}"
        ) from None
    print(f"[OK] Pushed main and {tag} together.")

    left: list[tuple[str, str]] = []
    if git(root, "branch", "--list", "plan"):
        try:
            git(root, "push", "origin", "plan")
            print("[OK] Pushed plan.")
        except ReleaseError as error:
            left.append((f"The plan push failed: {error}", "git push origin plan"))
    if not opts.skip_github_release:
        command = f'gh release create {tag} --title {tag} --notes "<the changelog entry of {tag}>"'
        if shutil.which("gh") is None:
            left.append(("The gh CLI is missing.", command))
        elif run(["gh", "release", "create", tag, "--title", tag, "--notes", notes], root):
            print(f"[OK] Created the GitHub release {tag}.")
        else:
            left.append(("Creating the GitHub release failed.", command))
    if opts.backend_dir:
        pin = f"edit todosWebappVersion={version} in gradle.properties of {opts.backend_dir}, and commit it"
        try:
            if not git(root, "ls-remote", "--tags", "origin", f"refs/tags/{tag}"):
                raise ReleaseError(f"{tag} is not on origin")
            if update_backend_pin(Path(opts.backend_dir), version):
                print(
                    f"[OK] Committed the pin todosWebappVersion={version} in {opts.backend_dir}; not pushed, not deployed."
                )
            else:
                print(f"[OK] The backend already pins {version}.")
        except ReleaseError as error:
            left.append((f"The backend pin was not committed: {error}", pin))

    if left:
        print(f"\n[!] {tag} is pushed, but these steps are left for you:", file=sys.stderr)
        for reason, command in left:
            print(f"    - {reason}\n      Do: {command}", file=sys.stderr)
        return 1
    if opts.backend_dir:
        print("     Next: deploy the todos server from that repository, then push its pin commit.")
    print(f"[OK] Released {tag}. Follow the Pages run in the Actions tab, then reload the site once.")
    return 0


def cut_release(root: Path, opts) -> int:
    """Cut a release; raise ReleaseError when a precondition or a step fails. Return the exit code."""
    changelog_path = root / "CHANGELOG.md"
    version = opts.release_version or top_pre_version(read_text(changelog_path))
    today = today_iso()
    tag = f"v{version}"
    next_version = next_patch(version)

    tool("node")
    if not opts.skip_github_release and shutil.which("gh") is None:
        raise ReleaseError("The gh CLI is missing; install it, or pass --skip-github-release.")
    preflight(root, version)
    finalize_changelog(read_text(changelog_path), version, today)
    check_rewritable(root)
    if opts.backend_dir:
        check_backend(Path(opts.backend_dir))
    if not opts.skip_checks and not run_all(check_commands(), root):
        raise ReleaseError("The checks failed; nothing was changed.")
    for line in describe_plan(root, version, next_version, opts):
        print(line)
    if opts.dry_run:
        print("\nDry run: nothing was changed.")
        return 0
    if not opts.yes and not confirm("\nProceed with the release? [y/N] "):
        print("Not confirmed: nothing was changed or pushed.")
        return 1
    if git(root, "status", "--porcelain"):
        raise ReleaseError(
            "The working tree changed while the checks ran; commit or discard the changes and start again."
        )
    start_sha = git(root, "rev-parse", "HEAD")
    notes = ""

    def release_commit() -> None:
        nonlocal notes
        write_text(changelog_path, finalize_changelog(read_text(changelog_path), version, today))
        notes = extract_release_notes(read_text(changelog_path), version)
        set_package_versions(root, version)
        set_version_js(root, version, today)
        bump_service_worker(root, today)
        if not verify_release_files(root, opts.skip_checks):
            raise ReleaseError("the verification of the release files failed")
        git(root, "add", "--", *existing(root, VERSION_FILES))
        git(root, "commit", "-m", f"Released {tag}.")
        git(root, "tag", "-a", tag, "-m", f"Released {tag}.")

    def next_commit() -> None:
        pre = f"{next_version}-pre"
        write_text(changelog_path, open_next_heading(read_text(changelog_path), next_version))
        set_package_versions(root, pre)
        set_version_js(root, pre, today)
        bump_service_worker(root, today)
        if not verify_service_worker(root):
            raise ReleaseError("the service worker check failed")
        git(root, "add", "--", *existing(root, VERSION_FILES))
        git(root, "commit", "-m", f"Opened v{pre} development after releasing {tag}.")

    edit_phase(root, "The release commit", tag, start_sha, release_commit)
    edit_phase(root, "The next development commit", tag, start_sha, next_commit)
    return publish(root, opts, version, notes, start_sha)


# --- Command line ------------------------------------------------------------------------------


def release_version_argument(text: str) -> str:
    """Accept a plain MAJOR.MINOR.PATCH release version."""
    if not SEMVER.fullmatch(text):
        raise argparse.ArgumentTypeError(f"'{text}' is not a version like 1.2.3, without a v prefix or suffix")
    return text


def port_argument(text: str) -> int:
    """Accept a TCP port from 1 to 65535."""
    try:
        port = int(text)
    except ValueError:
        port = 0
    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError(f"'{text}' is not a port from 1 to 65535")
    return port


def configure_release(parser: argparse.ArgumentParser) -> None:
    """Add the DevopsCli release options, plus the todos version operand and backend pin."""
    parser.add_argument(
        "release_version",
        nargs="?",
        metavar="VERSION",
        type=release_version_argument,
        help="version to release, such as 0.6.0; default: the -pre heading without -pre",
    )
    parser.add_argument("--dry-run", action="store_true", help="run the checks, print the plan, change nothing")
    parser.add_argument("--skip-checks", action="store_true", help="skip the check run and the release unit tests")
    parser.add_argument(
        "--skip-github-release",
        "--no-github-release",
        dest="skip_github_release",
        action="store_true",
        help="do not create the GitHub release",
    )
    parser.add_argument("--yes", action="store_true", help="skip the y/N question; never skips the preconditions")
    parser.add_argument(
        "--backend-dir", metavar="PATH", help="commit the todosWebappVersion pin in this todos checkout; never pushed"
    )


def configure_server(parser: argparse.ArgumentParser) -> None:
    """Add the server operation, port, and background options."""
    parser.add_argument("operation", choices=SERVER_OPERATIONS, help="start or stop the dev server")
    parser.add_argument(
        "--port", type=port_argument, default=SERVER_PORT, help=f"port to serve on or stop; default {SERVER_PORT}"
    )
    parser.add_argument("--background", action="store_true", help="server start: run detached and print the PID")


def build_cli(root: Path = REPO_ROOT) -> DevopsCli:
    """Create the DevopsCli of this project, with the e2e, server, and todos release actions."""
    project = TodosProject(root)
    cli = DevopsCli(project, description=DESCRIPTION, copyright=COPYRIGHT)

    def e2e(args, logger) -> int:
        """Run the Playwright end-to-end tests."""
        project.logger = logger
        return 0 if project.test_slow(()) else 1

    def server(args, logger) -> int:
        """Start or stop the dev server."""
        project.logger = logger
        if args.background and args.operation != "start":
            logger.error("--background needs 'server start'")
            return 2
        try:
            if args.operation == "start":
                return server_start(project.root, args.background, args.port)
            return server_stop(project.root, args.port)
        except (ReleaseError, OSError) as error:
            logger.error(str(error))
            return 1

    def release(args, logger) -> int:
        """Hand the todos release options to the project, then run DevopsCli's release action."""
        project.release_target = args.release_version
        project.backend_dir = args.backend_dir
        return cli._release(args, logger)

    cli.add_action("e2e", "run the Playwright end-to-end tests, like test --slow", e2e, usage_suffix="")
    cli.add_action(
        "server",
        "start or stop the dev server of src/ at http://127.0.0.1:8080/",
        server,
        detail=(
            "server start runs scripts/serve.mjs in the foreground until Ctrl+C or server stop.\n"
            "server start --background runs it detached, prints the PID, and logs to work/server.log.\n"
            "server stop asks it to exit through work/server.stop and never kills it."
        ),
        usage_suffix="start|stop [--port PORT] [--background]",
        configure_parser=configure_server,
    )
    cli.add_action(
        "release",
        project.action_summaries()["release"],
        release,
        detail=(
            "Cut a release from main, following docs/devops.md, Release Procedure: preconditions, checks, the plan,\n"
            "a y/N question, the release and next -pre commits, git push --atomic origin main TAG, git push origin plan,\n"
            "the GitHub release, and with --backend-dir the todosWebappVersion pin, committed locally only."
        ),
        usage_suffix="[VERSION] [--dry-run] [--skip-checks] [--skip-github-release] [--yes] [--backend-dir PATH]",
        configure_parser=configure_release,
    )
    return cli


def main(argv: list[str] | None = None) -> int:
    """Run the command line and return the exit code."""
    return build_cli().run(argv)


if __name__ == "__main__":
    sys.exit(main())
