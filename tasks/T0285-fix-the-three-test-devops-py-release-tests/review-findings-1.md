---
task: T0285
round: 1
verdict: approved
blocking: 0
reviewer: "@claude"
reviewed_at: 2026-11-17T23:20:07Z
reviewed_commit: "84fe744"
base_commit: "9931a19"
branch: task/T0285-fix-the-three-test-devops-py-release-tests
session: claude-20261118-d43413
session_agent: claude-code
session_created_at: 2026-11-17T23:14:25Z
---
# Review Findings: Task T0285 (Round 1)

## Summary
Approved. The goal is met: all three failing release tests now pass.

- Root cause confirmed: the global Python has support-python 3.1.0 (`importlib.metadata` reports 3.1.0).
- support-python v3.3.0 `DevopsCli._release` forwards the skip options only when set and falls back to `ReleasePipeline` on `None`.
- `TodosProject.release` always returns a bool, so calling it directly drops no behavior.
- The direct call also makes the fix independent of the installed support-python version.
- The new unit test reproduces the 3.1.0 forwarding and asserts both skip options plus version and backend dir.

Reviewer runs:

```text
python -m pytest tests/test_devops.py -q                       -> 89 passed (global support-python 3.1.0)
PYTHONPATH=support.python/src python -m pytest tests/test_devops.py -q -> 89 passed (v3.3.0 sources)
python -m pytest -q tests                                      -> 190 passed
python -m ruff check scripts tests; ruff format --check        -> All checks passed; 4 files already formatted
```

## Defects
None.

## Process Gaps
- Non-blocking: after the fix, the new test's patch of `DevopsCli._release` is never reached.
  It still guards against a return to delegation, which the validation proof shows failing before the fix.
- Non-blocking: the CHANGELOG entry runs about 30 words, above the 20-word cap for version-controlled prose.
  Neighboring entries are similar in length.
- Non-blocking: the environment drift persists; the global Python still has 3.1.0 against the v3.3.0 pin in `scripts/requirements.txt`.
  A follow-up could add a `.venv` or a version check, but the task goal does not require it.

## Required Rework
None.
