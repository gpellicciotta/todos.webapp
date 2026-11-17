## Walkthrough & Validation

### Key Changes
- `scripts/devops.py` is a support-python 3.3.0 `DevopsCli` over `TodosProject(NodeProject)`.
- Overrides: `lint`, `format`, `test`, `test_slow`, `build`, `release_assets`, `check`, `action_summaries`, `release`.
- Added actions: `e2e` and `server start|stop`; `release` is re-registered to add `VERSION` and `--backend-dir`.
- The release handler hands both to the project, then runs `DevopsCli._release`, which calls the `Project.release` override.
- `scripts/requirements.txt` pins support-python v3.3.0, pytest, and Ruff; `devops.py` re-runs itself in `.venv`.
- Undeclared files: `.gitignore` and `eslint.config.js` ignore `.venv/`; `_cli_common.py` is deleted.
- `scripts/draw-wireframes.py` was already unformatted on main; `ruff format scripts tests` fixed it.

### Failing tests before the implementation (old script, `PYTHONPATH=scripts`)
Command: `.venv/Scripts/python.exe -m pytest -q tests/test_devops.py -p no:cacheprovider`. Exit code: 1.

```text
FAILED tests/test_devops.py::test_release_cuts_the_release_end_to_end - Attri...
FAILED tests/test_devops.py::test_cli_help_lists_every_action_and_the_exit_codes
FAILED tests/test_devops.py::test_lint_runs_eslint_then_the_ruff_checks - Att...
FAILED tests/test_devops.py::test_format_fixes_ruff_findings_formats_and_runs_eslint_fix
FAILED tests/test_devops.py::test_test_runs_vitest_then_pytest - AttributeErr...
FAILED tests/test_devops.py::test_test_sends_a_python_selection_to_pytest_and_any_other_to_vitest
FAILED tests/test_devops.py::test_test_slow_and_e2e_run_the_playwright_tests
FAILED tests/test_devops.py::test_check_runs_the_pages_test_job_then_the_python_checks_in_order
FAILED tests/test_devops.py::test_build_runs_nothing_and_succeeds_since_the_app_has_no_build_step
FAILED tests/test_devops.py::test_the_cli_is_a_devops_cli_with_the_todos_actions
FAILED tests/test_devops.py::test_the_release_action_runs_the_project_release_override_with_every_option
FAILED tests/test_devops.py::test_the_release_override_reports_a_failed_step_and_exits_1
[... 27 lines omitted ...]
39 failed, 49 passed in 85.52s (0:01:25)
```

### Tests after the implementation
Command: `python scripts/devops.py test`. Exit code: 0.

```text
Command: C:\Dev-Projects\todos.webapp\.plan\work\T0267-move-scripts-devops-py-onto-support-python-v3\.venv\Scripts\python.exe -m pytest -q tests
Process ID: 43536
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed in 85.84s (0:01:25)
```

Vitest in the same run: `Test Files  65 passed (65)`, `Tests  1691 passed (1691)`.

### Lint
Command: `python scripts/devops.py lint`. Exit code: 0.

```text
Command: C:\Dev-Projects\todos.webapp\.plan\work\T0267-move-scripts-devops-py-onto-support-python-v3\.venv\Scripts\python.exe -m ruff check scripts tests
Process ID: 36984
All checks passed!
Command: C:\Dev-Projects\todos.webapp\.plan\work\T0267-move-scripts-devops-py-onto-support-python-v3\.venv\Scripts\python.exe -m ruff format --check scripts tests
Process ID: 9912
4 files already formatted
```

### Check: fails only on an e2e test that also fails on main
Command: `python scripts/devops.py check`. Exit code: 1.

```text
OK: 131 precached files match VERSION 2026-11-17.21.
 Test Files  65 passed (65)
      Tests  1691 passed (1691)
  1) [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it 
    Error: expect(locator).toBeFocused() failed
  1 failed
  245 passed (3.4m)
**[ERROR]** Finished devops check in 226.1s with status: failed
```

The same test on a clean clone of main at 3ee12ec. Command: `npx playwright test tests/e2e/behaviors.spec.js:109 --reporter=line`. Exit code: 1.

```text
    Error: expect(locator).toBeFocused() failed
  1 failed
```

Follow-up: T0274 fixes that test. The steps after e2e, Ruff and pytest, pass in `lint` and `test` above.

### Release dry runs, in a scratch clone of the task branch renamed to main
Command: `{{worktree}}/.venv/Scripts/python.exe scripts/devops.py release --dry-run --skip-github-release`. Exit code: 1.

```text
OK: 131 precached files match VERSION 2026-11-17.21.
      Tests  1691 passed (1691)
  1) [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it 
  1 failed
  245 passed (3.6m)
**[ERROR]** The checks failed; nothing was changed.
**[ERROR]** Finished devops release in 246.2s with status: failed
```

Command: `{{worktree}}/.venv/Scripts/python.exe scripts/devops.py release --dry-run --skip-checks --skip-github-release`. Exit code: 0.

```text
Release         : v0.5.1, dated 2026-11-17
Next version    : v0.5.2-pre
Files           : CHANGELOG.md, package.json, package-lock.json, src/js/version.js, src/service-worker.js, scripts/sw-precache-hashes.json
Checks          : skipped
Local commands, after the question:
  git commit -m "Released v0.5.1."
  git tag -a v0.5.1 -m "Released v0.5.1."
  git commit -m "Opened v0.5.2-pre development after releasing v0.5.1."
Commands that publish:
  git push --atomic origin main v0.5.1
  (no GitHub release)
Also published  : 1 commit(s) not yet on origin/main
  fc7b690 Rebuilt scripts/devops.py on support-python 3.3.0 DevopsCli with a todos release override and a pinned .venv.

Dry run: nothing was changed.
```

`git status --porcelain` in the clone printed nothing afterward, and HEAD stayed at fc7b690.

### Markdown
Command: `.venv/Scripts/lint-markdown.exe check CHANGELOG.md --offline`. Exit code: 0.

```text
All 1 markdown files passed linting.
```

`docs/devops.md` reports two links that predate this task and fail only in a worktree: `../../support.webapp/README.md` and `../PLAN.md`.
