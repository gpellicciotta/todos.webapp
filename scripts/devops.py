#!/usr/bin/env python3
"""Runs the typical operations of this project: lint, test, e2e, check, and release.

The app has no build step, so a release finalizes the version files and the changelog, tags, and publishes.
Install the tools once, as docs/devops.md describes: Node.js with npm, Python with pytest, and Ruff.

Usage:
  python scripts/devops.py lint
  python scripts/devops.py test
  python scripts/devops.py e2e
  python scripts/devops.py check
  python scripts/devops.py release [{{version}}] [--dry-run] [--skip-checks] [--yes]
                                   [--no-github-release] [--backend-dir {{path}}]
  python scripts/devops.py --version

`release` follows docs/devops.md, Release Procedure. It never pushes the todos server repository.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

from _cli_common import build_action_parser, get_project_version, print_help, print_version

PROG = "devops"
DESCRIPTION = "Runs the lint, test, e2e, check, and release operations of this project."
ACTIONS = ["lint", "test", "e2e", "check", "release", "version", "help"]
EXIT_CODES = [
    (0, "Success"),
    (1, "An operation, check, precondition, or release step failed, or the release was not confirmed"),
    (2, "Invalid arguments"),
]
ACTION_DOCS = {
    "lint": "Run ESLint, then Ruff check and format check on scripts and tests.",
    "test": "Run the Vitest unit tests, then the pytest tests.",
    "e2e": "Run the Playwright end-to-end tests.",
    "check": "Run what the Pages test job runs, plus the Python checks: service worker check, unit, lint, e2e, Ruff, pytest.",
    "release": (
        "Cut a release from main. With {{version}}, rename the single -pre changelog heading to it.\n"
        "      --dry-run              check the preconditions and print the plan; change nothing but fetched refs\n"
        "      --skip-checks          skip the full check run and the unit tests of the release commit\n"
        "      --yes                  skip the confirmation question; never skips the preconditions\n"
        "      --no-github-release    do not create the GitHub release\n"
        "      --backend-dir {{path}}  commit the todosWebappVersion pin in the todos repository; never pushed"
    ),
    "version": "Print the project version.",
    "help": "Print this help; with --verbose, describe every action.",
}
REPO_ROOT = Path(__file__).resolve().parent.parent
SEMVER = re.compile(r"\d+\.\d+\.\d+")
HEADING = re.compile(r"^## v(\d+\.\d+\.\d+)(-pre)?([^\r\n]*)", re.MULTILINE)
VERSION_JS = "src/js/version.js"
SERVICE_WORKER = "src/service-worker.js"
SW_MANIFEST = "scripts/sw-precache-hashes.json"
SW_CHECK = "scripts/check-sw-version.mjs"
VERSION_FILES = ["CHANGELOG.md", "package.json", "package-lock.json", VERSION_JS, SERVICE_WORKER, SW_MANIFEST]


class ReleaseError(Exception):
    """A release precondition or step failed."""


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
    """Run one command in a folder, echoing it first. Return whether it succeeded."""
    print(f"[*] {' '.join(command)}", flush=True)
    return subprocess.run(command, cwd=root, check=False).returncode == 0


def tool(name: str) -> str:
    """Return the path of a required tool; raise ReleaseError when it is missing."""
    path = shutil.which(name)
    if path is None:
        raise ReleaseError(f"'{name}' is not installed or not on PATH.")
    return path


def ruff() -> list[str]:
    """Return the command that starts Ruff."""
    path = shutil.which("ruff")
    return [path] if path else [sys.executable, "-m", "ruff"]


# --- Check actions -----------------------------------------------------------------------------


def lint_commands() -> list[list[str]]:
    """Return the lint commands: ESLint and Ruff."""
    return [
        [tool("npm"), "run", "lint"],
        [*ruff(), "check", "scripts", "tests"],
        [*ruff(), "format", "--check", "scripts", "tests"],
    ]


def test_commands() -> list[list[str]]:
    """Return the unit test commands: Vitest and pytest."""
    return [[tool("npm"), "test"], [sys.executable, "-m", "pytest", "-q"]]


def e2e_commands() -> list[list[str]]:
    """Return the end-to-end test command."""
    return [[tool("npm"), "run", "test:e2e"]]


def check_commands() -> list[list[str]]:
    """Return every check: the Pages test job steps, then the Python checks."""
    npm = tool("npm")
    return [
        [tool("node"), SW_CHECK],
        [npm, "test"],
        [npm, "run", "lint"],
        [npm, "run", "test:e2e"],
        [*ruff(), "check", "scripts", "tests"],
        [*ruff(), "format", "--check", "scripts", "tests"],
        [sys.executable, "-m", "pytest", "-q"],
    ]


def run_all(commands: list[list[str]], root: Path) -> bool:
    """Run the commands in order and stop at the first failure."""
    return all(run(command, root) for command in commands)


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
    replace_once(root / "package.json", r'^(  "version":\s*")[^"]+(")', rf"\g<1>{version}\g<2>")
    lock = root / "package-lock.json"
    if lock.exists():
        replace_once(lock, r'("name":\s*"todos-webapp",\s*"version":\s*")[^"]+(")', rf"\g<1>{version}\g<2>", count=0)


def set_version_js(root: Path, version: str, build_date: str) -> None:
    """Set VERSION and BUILD_DATE, which Settings shows under About."""
    path = root / VERSION_JS
    replace_once(path, r"(export const VERSION = ')[^']*(';)", rf"\g<1>{version}\g<2>")
    replace_once(path, r"(export const BUILD_DATE = ')[^']*(';)", rf"\g<1>{build_date}\g<2>")


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
    replace_once(path, r"(const VERSION = ')[^']+(';)", rf"\g<1>{next_sw_version(found.group(1), today)}\g<2>")
    if not run([tool("node"), SW_CHECK, "--update"], root):
        raise ReleaseError("Rewriting the service worker hash manifest failed.")


# --- Release -----------------------------------------------------------------------------------


def preflight(root: Path, version: str) -> None:
    """Check that main is clean, current, and free of the release tag; raise ReleaseError if not."""
    if git(root, "branch", "--show-current") != "main":
        raise ReleaseError("Releases are cut from the 'main' branch.")
    if git(root, "status", "--porcelain"):
        raise ReleaseError("There are uncommitted changes; commit them before releasing.")
    git(root, "fetch", "origin", "main", "--tags")
    behind = int(git(root, "rev-list", "--count", "HEAD..origin/main"))
    if behind:
        raise ReleaseError(f"main is {behind} commit(s) behind origin/main; pull first.")
    tag = f"v{version}"
    if git(root, "tag", "--list", tag) or git(root, "ls-remote", "--tags", "origin", f"refs/tags/{tag}"):
        raise ReleaseError(f"The tag {tag} already exists.")


def check_backend(backend_dir: Path) -> Path:
    """Check that the todos server repository can take the pin commit; return its gradle.properties."""
    gradle = backend_dir / "gradle.properties"
    if not gradle.exists():
        raise ReleaseError(f"{gradle} does not exist; --backend-dir must name the todos repository.")
    if git(backend_dir, "status", "--porcelain"):
        raise ReleaseError(f"The backend repository {backend_dir} has uncommitted changes; commit them first.")
    if not re.search(r"^todosWebappVersion=", read_text(gradle), re.MULTILINE):
        raise ReleaseError("gradle.properties of the backend has no todosWebappVersion line.")
    return gradle


def update_backend_pin(backend_dir: Path, version: str) -> None:
    """Set todosWebappVersion in the todos repository and commit it locally. Never pushes or deploys."""
    gradle = check_backend(backend_dir)
    replace_once(gradle, r"^todosWebappVersion=[^\r\n]*", f"todosWebappVersion={version}")
    git(backend_dir, "add", "gradle.properties")
    git(backend_dir, "commit", "-m", f"Pinned todos.webapp v{version}.")


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
    """Restore edited files from the last commit."""
    git(root, "checkout", "--", *existing(root, names))


def describe_plan(root: Path, version: str, next_version: str, opts) -> list[str]:
    """Return the lines that tell the user what a release will do, ending with the commands that publish."""
    tag = f"v{version}"
    lines = [
        f"Release         : {tag}, dated {today_iso()}",
        f"Next version    : v{next_version}-pre",
        f"Commits         : 'Released {tag}.', then 'Opened v{next_version}-pre development after releasing {tag}.'",
        f"Files           : {', '.join(existing(root, VERSION_FILES))}",
        f"Checks          : {'skipped' if opts.skip_checks else 'service worker, unit, lint, e2e, Ruff, pytest'}",
        "Commands that publish:",
        f"  git push origin main {tag}",
    ]
    if git(root, "branch", "--list", "plan"):
        lines.append("  git push origin plan")
    lines.append(
        "  (no GitHub release)"
        if opts.no_github_release
        else f"  gh release create {tag} --title {tag} --notes {{{{changelog entry}}}}"
    )
    if opts.backend_dir:
        lines.append(
            f"Backend pin     : todosWebappVersion={version} in {opts.backend_dir}; committed locally, never pushed or deployed"
        )
    return lines


def release(root: Path, opts) -> int:
    """Cut a release; raise ReleaseError when a precondition or a step fails. Return the exit code."""
    changelog_path = root / "CHANGELOG.md"
    version = opts.release_version or top_pre_version(read_text(changelog_path))
    today = today_iso()
    tag = f"v{version}"
    next_version = next_patch(version)

    preflight(root, version)
    finalize_changelog(read_text(changelog_path), version, today)
    if opts.backend_dir:
        check_backend(Path(opts.backend_dir))
    for line in describe_plan(root, version, next_version, opts):
        print(line)
    if opts.dry_run:
        print("\nDry run: nothing was changed.")
        return 0
    if not opts.yes and input("\nProceed with the release? [y/N] ").strip().lower() not in {"y", "yes"}:
        print("Not confirmed: nothing was changed or pushed.")
        return 1

    if not opts.skip_checks and not run_all(check_commands(), root):
        raise ReleaseError("The checks failed; nothing was changed.")

    # Commit 1: the released version, tagged.
    write_text(changelog_path, finalize_changelog(read_text(changelog_path), version, today))
    notes = extract_release_notes(read_text(changelog_path), version)
    set_package_versions(root, version)
    set_version_js(root, version, today)
    bump_service_worker(root, today)
    if not verify_release_files(root, opts.skip_checks):
        restore(root, VERSION_FILES)
        raise ReleaseError("Release verification failed; the version files were restored.")
    git(root, "add", "--", *existing(root, VERSION_FILES))
    git(root, "commit", "-m", f"Released {tag}.")
    git(root, "tag", "-a", tag, "-m", f"Released {tag}.")

    # Commit 2: the next development version.
    pre = f"{next_version}-pre"
    write_text(changelog_path, open_next_heading(read_text(changelog_path), next_version))
    set_package_versions(root, pre)
    set_version_js(root, pre, today)
    bump_service_worker(root, today)
    if not verify_service_worker(root):
        restore(root, VERSION_FILES)
        raise ReleaseError(
            f"Verification failed; the release commit and tag {tag} exist locally and nothing was pushed."
        )
    git(root, "add", "--", *existing(root, VERSION_FILES))
    git(root, "commit", "-m", f"Opened v{pre} development after releasing {tag}.")

    # Publish.
    git(root, "push", "origin", "main", tag)
    print(f"[OK] Pushed main and {tag}.")
    if git(root, "branch", "--list", "plan"):
        git(root, "push", "origin", "plan")
        print("[OK] Pushed plan.")
    if not opts.no_github_release:
        if shutil.which("gh") is None:
            print("[!] The gh CLI is missing: create the GitHub release by hand.")
        elif run(["gh", "release", "create", tag, "--title", tag, "--notes", notes], root):
            print(f"[OK] Created the GitHub release {tag}.")
        else:
            raise ReleaseError(f"{tag} is pushed, but creating the GitHub release failed.")
    if opts.backend_dir:
        update_backend_pin(Path(opts.backend_dir), version)
        print(f"[OK] Committed the pin todosWebappVersion={version} in {opts.backend_dir}; not pushed, not deployed.")
        print("     Next: deploy the todos server from that repository, then push its commit.")
    print(f"[OK] Released {tag}. Follow the Pages run in the Actions tab, then reload the site once.")
    return 0


# --- Entry point -------------------------------------------------------------------------------


def print_verbose_help() -> None:
    """Describe every action."""
    print("\nActions:")
    for name in ACTIONS:
        print(f"  {name:<8} {ACTION_DOCS[name]}")


def main(argv: list[str] | None = None) -> int:
    """Parse the command line and run the action. Return the exit code."""
    parser = build_action_parser(PROG, DESCRIPTION, ACTIONS, "help")
    parser.allow_abbrev = False
    parser.add_argument("release_version", nargs="?", help="release: the version to release, such as 0.2.0")
    parser.add_argument("--verbose", action="store_true", help="help: describe every action")
    parser.add_argument("--dry-run", action="store_true", help="release: print the plan and change nothing")
    parser.add_argument("--skip-checks", action="store_true", help="release: skip the check run and the unit tests")
    parser.add_argument("--yes", action="store_true", help="release: do not ask for confirmation")
    parser.add_argument("--no-github-release", action="store_true", help="release: do not create a GitHub release")
    parser.add_argument("--backend-dir", help="release: commit the todosWebappVersion pin in this todos checkout")
    args = parser.parse_args(argv)
    version = get_project_version()

    release_only = args.release_version or args.dry_run or args.skip_checks or args.yes
    release_only = release_only or args.no_github_release or args.backend_dir
    if release_only and args.action != "release":
        parser.error(
            "a version and the options --dry-run, --skip-checks, --yes, --no-github-release, --backend-dir need 'release'"
        )
    if args.version or args.action == "version":
        print_version(PROG, version)
        return 0
    if args.help or args.action == "help":
        print_help(PROG, version, DESCRIPTION, parser, EXIT_CODES)
        if args.verbose:
            print_verbose_help()
        return 0

    try:
        if args.action == "release":
            return release(REPO_ROOT, args)
        commands = {"lint": lint_commands, "test": test_commands, "e2e": e2e_commands, "check": check_commands}
        return 0 if run_all(commands[args.action](), REPO_ROOT) else 1
    except ReleaseError as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
