---
task: T0267
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T10:12:30Z
reviewed_commit: "91bf930"
base_commit: "3ee12ec"
branch: task/T0267-move-scripts-devops-py-onto-support-python-v3
---
# Review Findings: Task T0267 (Round 1)

## Summary
**[Decided]** Rejected because the explicit completion check remains unmet.
The DevopsCli migration, T0218 mappings, dependency pin, and project release override otherwise match the goals.
No additional implementation defect was found.

Independent verification:
- `.venv/Scripts/python.exe -m pytest -q tests/test_devops.py -p no:cacheprovider`: exit 0; `88 passed in 385.49s (0:06:25)`.
- `python scripts/devops.py lint`: exit 0; ESLint, Ruff check, and Ruff format check passed.
- Installed support-python reports version `3.3.0`.
- `git status --short`: no output after verification.

Reviewed both commits, the complete diff, T0218's decision, and the recorded failing-first and final evidence.
The affected tests exercise actual CLI entry points, server startup/shutdown, release files, backend pinning, and atomic publication.

## Defects
- Blocking B1: The two required completion commands do not pass.
  [validation-proof.md](validation-proof.md) records exit 1 for `python scripts/devops.py check`.
  It also records exit 1 for `python scripts/devops.py release --dry-run --skip-github-release`.
  Both stop at the keyboard popover test in `behaviors.spec.js:109`.
  The evidence reproduces that failure on main, so this review does not attribute it to the migration.
  Nevertheless, the task explicitly requires both commands to pass.
  The successful `--skip-checks` dry run does not satisfy that requirement.
  Filing T0274 does not change the acceptance criterion.

## Process Gaps
- Non-blocking: The new CLI server integration test uses the repository's shared `work/server.*` state.
  Unlike existing direct server tests, it does not redirect state into `tmp_path`.
  Concurrent runs can interfere with server state, contrary to the testing isolation guideline.

## Required Rework
Resolve B1 through one of these paths:
- Integrate the T0274 fix, then record successful runs of both exact completion commands without `--skip-checks`.
- Obtain a human decision explicitly accepting the reproduced baseline failure and revise the completion criterion accordingly.

No unrelated implementation changes are requested.
