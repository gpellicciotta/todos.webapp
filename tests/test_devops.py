"""Tests for scripts/devops.py, which runs the checks and cuts the releases of this project."""

import argparse
import importlib.util
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
NODE = shutil.which("node")
needs_node = pytest.mark.skipif(NODE is None, reason="Node.js is needed for the service worker manifest")

CHANGELOG = """# Changelog
All notable changes to this project are documented here.

## v0.1.3-pre
- FrontEnd: Added a thing.

## v0.1.0 [released: 2026-11-05]
- FrontEnd: Added the first version.
"""

LOCK = """{
  "name": "todos-webapp",
  "version": "0.1.3-pre",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "todos-webapp",
      "version": "0.1.3-pre",
      "license": "MIT"
    },
    "node_modules/other": {
      "version": "1.2.3"
    }
  }
}
"""

PACKAGE = '{\n  "name": "todos-webapp",\n  "version": "0.1.3-pre",\n  "private": true\n}\n'

VERSION_JS = """export const VERSION = '0.1.3-pre';

/** The day the release was built, as an ISO date. */
export const BUILD_DATE = '2026-11-06';
"""

GITIGNORE = "__pycache__/" + chr(10)

GRADLE = "org.gradle.jvmargs=-Xmx2g\ntodosWebappVersion=0.1.0\nother=1\n"


def load_script():
    """Import scripts/devops.py as a module, with scripts/ on the import path for _cli_common."""
    sys.path.insert(0, str(SCRIPTS))
    try:
        spec = importlib.util.spec_from_file_location("devops", SCRIPTS / "devops.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    finally:
        sys.path.remove(str(SCRIPTS))
    return module


devops = load_script()


def git(cwd, *args):
    """Run git in a folder and return its output."""
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def make_repo(path, files):
    """Create a git repository with a first commit holding the given files."""
    path.mkdir(parents=True, exist_ok=True)
    git(path, "init", "-q", "-b", "main")
    git(path, "config", "core.autocrlf", "false")
    for name, content in files.items():
        target = path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8", newline="\n")
    git(path, "add", "-A")
    git(path, "commit", "-q", "-m", "Created the repository.")
    return path


def options(**overrides):
    """Build the parsed release options with safe defaults for tests."""
    values = {
        "release_version": None,
        "dry_run": False,
        "skip_checks": True,
        "yes": True,
        "no_github_release": True,
        "backend_dir": None,
    }
    values.update(overrides)
    return argparse.Namespace(**values)


@pytest.fixture(autouse=True)
def git_identity(monkeypatch):
    """Give every scratch commit an author, and fix the release date."""
    for key, value in {"NAME": "Test User", "EMAIL": "test@example.com"}.items():
        monkeypatch.setenv(f"GIT_AUTHOR_{key}", value)
        monkeypatch.setenv(f"GIT_COMMITTER_{key}", value)
    monkeypatch.setattr(devops, "today_iso", lambda: "2026-11-20")


@pytest.fixture
def project(tmp_path):
    """A scratch copy of the project with a bare local origin and a plan branch."""
    files = {
        ".gitignore": GITIGNORE,
        "CHANGELOG.md": CHANGELOG,
        "package.json": PACKAGE,
        "package-lock.json": LOCK,
        "src/js/version.js": VERSION_JS,
    }
    root = make_repo(tmp_path / "work", files)
    shutil.copytree(ROOT / "src", root / "src", dirs_exist_ok=True)
    (root / "src/js/version.js").write_text(VERSION_JS, encoding="utf-8", newline="\n")
    (root / "scripts").mkdir(exist_ok=True)
    for name in ("check-sw-version.mjs", "sw-precache-hashes.json", "devops.py", "_cli_common.py"):
        shutil.copy(SCRIPTS / name, root / "scripts" / name)
    git(root, "add", "-A")
    git(root, "commit", "-q", "-m", "Copied the sources.")
    origin = tmp_path / "origin.git"
    git(tmp_path, "init", "-q", "--bare", "-b", "main", str(origin))
    git(root, "remote", "add", "origin", str(origin))
    git(root, "branch", "plan")
    git(root, "push", "-q", "origin", "main", "plan")
    return root


@pytest.fixture
def backend(tmp_path):
    """A scratch todos server repository with a bare remote that must stay empty."""
    repo = make_repo(tmp_path / "todos", {"gradle.properties": GRADLE})
    remote = tmp_path / "todos-remote.git"
    git(tmp_path, "init", "-q", "--bare", "-b", "main", str(remote))
    git(repo, "remote", "add", "origin", str(remote))
    return repo


# --- Changelog ---------------------------------------------------------------------------------


def test_finalize_changelog_renames_the_pre_heading_in_place():
    result = devops.finalize_changelog(CHANGELOG, "0.2.0", "2026-11-20")
    assert "## v0.2.0 [released: 2026-11-20]\n- FrontEnd: Added a thing." in result
    assert "-pre" not in result
    assert "## v0.1.0 [released: 2026-11-05]\n- FrontEnd: Added the first version." in result


def test_open_next_heading_puts_a_pre_heading_on_top():
    released = devops.finalize_changelog(CHANGELOG, "0.2.0", "2026-11-20")
    result = devops.open_next_heading(released, "0.2.1")
    assert "## v0.2.1-pre\n\n## v0.2.0 [released: 2026-11-20]" in result
    assert result.count("-pre") == 1


@pytest.mark.parametrize("version", ["0.1.0", "0.0.9", "1.0", "v0.2.0", "0.2.0-pre"])
def test_finalize_changelog_rejects_a_version_that_is_not_above_the_last_release(version):
    with pytest.raises(devops.ReleaseError):
        devops.finalize_changelog(CHANGELOG, version, "2026-11-20")


def test_finalize_changelog_rejects_a_missing_pre_heading():
    released = CHANGELOG.replace("## v0.1.3-pre", "## v0.1.3 [released: 2026-11-06]")
    with pytest.raises(devops.ReleaseError, match="-pre"):
        devops.finalize_changelog(released, "0.2.0", "2026-11-20")


def test_release_notes_hold_only_the_bullets_of_that_version():
    released = devops.finalize_changelog(CHANGELOG, "0.2.0", "2026-11-20")
    assert devops.extract_release_notes(released, "0.2.0") == "- FrontEnd: Added a thing."


def test_next_patch_raises_the_last_number():
    assert devops.next_patch("0.2.0") == "0.2.1"
    assert devops.next_patch("1.9.9") == "1.9.10"


# --- Version files -----------------------------------------------------------------------------


def test_set_package_versions_rewrite_both_files_and_nothing_else(tmp_path):
    (tmp_path / "package.json").write_text(PACKAGE, encoding="utf-8", newline="\n")
    (tmp_path / "package-lock.json").write_text(LOCK, encoding="utf-8", newline="\n")
    devops.set_package_versions(tmp_path, "0.2.0")
    assert json.loads((tmp_path / "package.json").read_text(encoding="utf-8"))["version"] == "0.2.0"
    lock = json.loads((tmp_path / "package-lock.json").read_text(encoding="utf-8"))
    assert lock["version"] == "0.2.0"
    assert lock["packages"][""]["version"] == "0.2.0"
    assert lock["packages"]["node_modules/other"]["version"] == "1.2.3"
    assert (tmp_path / "package-lock.json").read_text(encoding="utf-8") == LOCK.replace("0.1.3-pre", "0.2.0")


def test_set_version_js_sets_the_version_and_the_build_date(tmp_path):
    (tmp_path / "src/js").mkdir(parents=True)
    (tmp_path / "src/js/version.js").write_text(VERSION_JS, encoding="utf-8", newline="\n")
    devops.set_version_js(tmp_path, "0.2.0", "2026-11-20")
    text = (tmp_path / "src/js/version.js").read_text(encoding="utf-8")
    assert "export const VERSION = '0.2.0';" in text
    assert "export const BUILD_DATE = '2026-11-20';" in text


def test_next_sw_version_counts_up_within_a_day_and_restarts_on_a_new_day():
    assert devops.next_sw_version("2026-11-20.3", "2026-11-20") == "2026-11-20.4"
    assert devops.next_sw_version("2026-11-06.15", "2026-11-20") == "2026-11-20.1"


# --- Preflight ---------------------------------------------------------------------------------


def test_preflight_passes_on_a_clean_main_in_sync_with_origin(project):
    devops.preflight(project, "0.2.0")


def test_preflight_refuses_a_dirty_tree(project):
    (project / "stray.txt").write_text("x", encoding="utf-8")
    with pytest.raises(devops.ReleaseError, match="uncommitted"):
        devops.preflight(project, "0.2.0")


def test_preflight_refuses_a_branch_other_than_main(project):
    git(project, "checkout", "-q", "-b", "feature")
    with pytest.raises(devops.ReleaseError, match="main"):
        devops.preflight(project, "0.2.0")


def test_preflight_refuses_a_main_behind_origin(project, tmp_path):
    other = tmp_path / "other"
    git(tmp_path, "clone", "-q", str(tmp_path / "origin.git"), str(other))
    (other / "new.txt").write_text("x", encoding="utf-8")
    git(other, "add", "-A")
    git(other, "commit", "-q", "-m", "Added a file.")
    git(other, "push", "-q", "origin", "main")
    with pytest.raises(devops.ReleaseError, match="behind"):
        devops.preflight(project, "0.2.0")


def test_preflight_refuses_an_existing_local_tag(project):
    git(project, "tag", "v0.2.0")
    with pytest.raises(devops.ReleaseError, match="v0.2.0"):
        devops.preflight(project, "0.2.0")


def test_preflight_refuses_an_existing_remote_tag(project, tmp_path):
    other = tmp_path / "other"
    git(tmp_path, "clone", "-q", str(tmp_path / "origin.git"), str(other))
    git(other, "tag", "v0.2.0")
    git(other, "push", "-q", "origin", "v0.2.0")
    with pytest.raises(devops.ReleaseError, match="v0.2.0"):
        devops.preflight(project, "0.2.0")


# --- Backend pin -------------------------------------------------------------------------------


def test_update_backend_pin_changes_only_the_pin_and_never_pushes(backend, tmp_path):
    devops.update_backend_pin(backend, "0.2.0")
    text = (backend / "gradle.properties").read_text(encoding="utf-8")
    assert text == GRADLE.replace("todosWebappVersion=0.1.0", "todosWebappVersion=0.2.0")
    assert git(backend, "log", "-1", "--format=%s") == "Pinned todos.webapp v0.2.0."
    assert git(backend, "status", "--porcelain") == ""
    assert git(tmp_path, "ls-remote", str(tmp_path / "todos-remote.git")) == ""


def test_update_backend_pin_refuses_a_dirty_backend(backend):
    (backend / "stray.txt").write_text("x", encoding="utf-8")
    before = git(backend, "rev-parse", "HEAD")
    with pytest.raises(devops.ReleaseError, match="uncommitted"):
        devops.update_backend_pin(backend, "0.2.0")
    assert git(backend, "rev-parse", "HEAD") == before


def test_update_backend_pin_refuses_a_missing_pin_line(backend):
    (backend / "gradle.properties").write_text("other=1\n", encoding="utf-8")
    git(backend, "commit", "-q", "-am", "Removed the pin.")
    with pytest.raises(devops.ReleaseError, match="todosWebappVersion"):
        devops.update_backend_pin(backend, "0.2.0")


# --- Release -----------------------------------------------------------------------------------


def snapshot(root):
    """Return the head commit, the tags, and the porcelain status of a repository."""
    return git(root, "rev-parse", "HEAD"), git(root, "tag"), git(root, "status", "--porcelain")


def test_release_without_confirmation_changes_and_pushes_nothing(project, monkeypatch, capsys):
    monkeypatch.setattr("builtins.input", lambda _prompt: "n")
    before = snapshot(project)
    origin_before = git(project, "ls-remote", "origin")
    code = devops.release(project, options(release_version="0.2.0", yes=False))
    assert code == 1
    assert snapshot(project) == before
    assert git(project, "ls-remote", "origin") == origin_before
    assert "git push origin main v0.2.0" in capsys.readouterr().out


def test_release_dry_run_changes_nothing_and_asks_nothing(project, monkeypatch, capsys):
    monkeypatch.setattr("builtins.input", lambda _prompt: pytest.fail("a dry run must not ask"))
    before = snapshot(project)
    code = devops.release(project, options(release_version="0.2.0", dry_run=True, yes=False))
    assert code == 0
    assert snapshot(project) == before
    assert "dry run" in capsys.readouterr().out.lower()


def test_release_rejects_a_version_not_above_the_last_release(project):
    with pytest.raises(devops.ReleaseError):
        devops.release(project, options(release_version="0.1.0"))


@needs_node
def test_release_cuts_the_release_end_to_end(project, backend, tmp_path):
    code = devops.release(project, options(release_version="0.2.0", backend_dir=backend))
    assert code == 0

    # Two commits on top of the copied sources: the release, then the next development version.
    subjects = git(project, "log", "-2", "--format=%s").splitlines()
    assert subjects == ["Opened v0.2.1-pre development after releasing v0.2.0.", "Released v0.2.0."]
    release_commit = git(project, "rev-parse", "HEAD~1")
    assert git(project, "rev-parse", "v0.2.0^{commit}") == release_commit
    assert git(project, "cat-file", "-t", "v0.2.0") == "tag"

    # The release commit holds the released versions; the head holds the next -pre versions.
    released_version_js = git(project, "show", f"{release_commit}:src/js/version.js")
    assert "VERSION = '0.2.0'" in released_version_js and "BUILD_DATE = '2026-11-20'" in released_version_js
    released_changelog = git(project, "show", f"{release_commit}:CHANGELOG.md")
    assert released_changelog.splitlines()[3] == "## v0.2.0 [released: 2026-11-20]"
    assert json.loads(git(project, "show", f"{release_commit}:package.json"))["version"] == "0.2.0"
    head_changelog = (project / "CHANGELOG.md").read_text(encoding="utf-8")
    assert head_changelog.startswith(
        "# Changelog\nAll notable changes to this project are documented here.\n\n## v0.2.1-pre\n"
    )
    assert json.loads((project / "package.json").read_text(encoding="utf-8"))["version"] == "0.2.1-pre"
    assert "VERSION = '0.2.1-pre'" in (project / "src/js/version.js").read_text(encoding="utf-8")

    # The service worker version moved on both commits, and the manifest matches the files.
    sw = (project / "src/service-worker.js").read_text(encoding="utf-8")
    assert "const VERSION = '2026-11-20.2';" in sw
    check = subprocess.run(
        [NODE, "scripts/check-sw-version.mjs"], cwd=project, capture_output=True, text=True, check=False
    )
    assert check.returncode == 0, check.stdout + check.stderr

    # main, plan, and the tag reached origin.
    remote = git(project, "ls-remote", "origin")
    assert f"{git(project, 'rev-parse', 'HEAD')}\trefs/heads/main" in remote
    assert "refs/tags/v0.2.0" in remote
    assert git(project, "rev-parse", "plan") in remote

    # The pin is committed in the backend without a push.
    assert "todosWebappVersion=0.2.0" in (backend / "gradle.properties").read_text(encoding="utf-8")
    assert git(backend, "log", "-1", "--format=%s") == "Pinned todos.webapp v0.2.0."
    assert git(tmp_path, "ls-remote", str(tmp_path / "todos-remote.git")) == ""


@needs_node
def test_release_failing_verification_restores_the_files(project, monkeypatch):
    monkeypatch.setattr(devops, "verify_release_files", lambda root, skip_checks: False)
    before = snapshot(project)
    with pytest.raises(devops.ReleaseError, match="verification"):
        devops.release(project, options(release_version="0.2.0"))
    assert snapshot(project) == before


# --- Command line ------------------------------------------------------------------------------


def run_cli(*args, cwd=ROOT):
    """Run the real entry point."""
    return subprocess.run(
        [sys.executable, str(SCRIPTS / "devops.py"), *args], cwd=cwd, capture_output=True, text=True, check=False
    )


def test_cli_version_prints_one_line_in_the_standard_format():
    result = run_cli("version")
    assert result.returncode == 0
    assert re.fullmatch(r"devops v\S+ - Copyright \(c\) .+", result.stdout.strip())
    assert run_cli("--version").stdout == result.stdout


def test_cli_help_lists_every_action_and_the_exit_codes():
    for flag in ("help", "--help", "-h"):
        result = run_cli(flag)
        assert result.returncode == 0
        for action in ("lint", "test", "e2e", "check", "release", "version", "help"):
            assert action in result.stdout
        assert "Exit codes:" in result.stdout


def test_cli_rejects_an_unknown_action_with_exit_code_2():
    result = run_cli("deploy")
    assert result.returncode == 2


@needs_node
def test_cli_release_dry_run_in_a_scratch_project_changes_nothing(project):
    before = snapshot(project)
    result = subprocess.run(
        [sys.executable, str(project / "scripts/devops.py"), "release", "0.2.0", "--dry-run", "--skip-checks"],
        cwd=project,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "git push origin main v0.2.0" in result.stdout
    assert snapshot(project) == before
