"""Shared command-line boilerplate for the standalone dev scripts under scripts/.

It keeps their version and help output consistent: a `{name} v{version} - {copyright}` line,
a description, the usage, and a list of exit codes, as the CLI guidelines require.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

APP_AUTHOR = "Giovanni Pellicciotta"

_REPO_ROOT = Path(__file__).resolve().parent.parent


def get_project_version() -> str:
    """Read the version from package.json, so the scripts report what the app reports."""
    try:
        return json.loads((_REPO_ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    except (OSError, KeyError, ValueError):
        return "0.0.0+unknown"


def build_action_parser(prog: str, description: str, actions: list, default_action: str) -> argparse.ArgumentParser:
    """Build an action-oriented parser with its own -h/--help and -v/--version.

    The caller prints the shared version and help template instead of argparse's default output.
    """
    parser = argparse.ArgumentParser(prog=prog, description=description, add_help=False)
    parser.add_argument("action", nargs="?", default=default_action, choices=actions, help="Action to perform")
    parser.add_argument("-h", "--help", action="store_true", help="Show this help message and exit")
    parser.add_argument("-v", "--version", action="store_true", help="Show version information and exit")
    return parser


def print_version(prog: str, version: str) -> None:
    """Print the single version line."""
    print(f"{prog} v{version} - Copyright (c) {APP_AUTHOR}")


def print_help(prog: str, version: str, description: str, parser: argparse.ArgumentParser, exit_codes: list) -> None:
    """Print the help screen: version line, description, usage, options, and exit codes."""
    print_version(prog, version)
    print()
    print(description)
    print()
    parser.print_help()
    print("\nExit codes:")
    for code, meaning in exit_codes:
        print(f"  {code}  {meaning}")
