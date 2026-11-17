## Technical Specifications

### Root Cause
- `python -m pytest` runs on the global Python, which has support-python 3.1.0; `scripts/requirements.txt` pins v3.3.0, and no `.venv` exists.
- support-python 3.1.0 `DevopsCli._release` calls `project.release(dry_run=..., assume_yes=...)` only, dropping `skip_checks` and `skip_github_release`.
- The two option tests therefore saw `False` for those options.
- The dry run lost `--skip-checks`, so it ran `check-sw-version.mjs`, which fails on the fixture's rewritten VERSION.
- With the v3.3.0 sources on `PYTHONPATH`, all 22 release tests passed unchanged.

### Fix
- The todos `release` action in `build_cli` calls `TodosProject.release` directly with every option instead of `cli._release`.

### Declared Files
- scripts/devops.py
- tests/test_devops.py

### Tests
- Unit: `test_the_release_action_keeps_every_option_when_devops_cli_forwards_only_some` replaces `DevopsCli._release` with the 3.1.0 forwarding.
- Integration: `test_cli_release_dry_run_in_a_scratch_project_changes_nothing` runs the release dry run in a scratch project.

Size estimate: 2 files, 30 lines

Completion check: python -m pytest tests/test_devops.py -q
