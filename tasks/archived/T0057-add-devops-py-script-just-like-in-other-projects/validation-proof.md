# T0057 Validation Proof

## Walkthrough & Validation

### Red phase
The tests were written first; they fail because scripts/devops.py does not exist yet.

Command: `python -m pytest tests/test_devops.py -q`
Exit code: 2

```text

=================================== ERRORS ====================================
____________________ ERROR collecting tests/test_devops.py ____________________
tests\test_devops.py:70: in <module>
    devops = load_script()
             ^^^^^^^^^^^^^
tests\test_devops.py:64: in load_script
    spec.loader.exec_module(module)
<frozen importlib._bootstrap_external>:995: in exec_module
    ???
<frozen importlib._bootstrap_external>:1132: in get_code
    ???
<frozen importlib._bootstrap_external>:1190: in get_data
    ???
E   FileNotFoundError: [Errno 2] No such file or directory: 'C:\\Dev-Projects\\todos.webapp\\scripts\\devops.py'
=========================== short test summary info ===========================
ERROR tests/test_devops.py - FileNotFoundError: [Errno 2] No such file or dir...
!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
1 error in 0.18s
```

### Green phase
All 59 tests pass after review rounds 1 to 3, including the end-to-end release in a scratch clone with a bare origin and a scratch todos repository, and the failure paths.

Command: `python -m pytest tests/test_devops.py -v`
Exit code: 0

```text
[... 32 lines omitted ...]
tests/test_devops.py::test_cli_help_lists_every_action_and_the_exit_codes PASSED [ 44%]
tests/test_devops.py::test_cli_rejects_an_unknown_action_with_exit_code_2 PASSED [ 45%]
tests/test_devops.py::test_cli_release_dry_run_in_a_scratch_project_changes_nothing PASSED [ 47%]
tests/test_devops.py::test_finalize_changelog_rejects_a_malformed_version[1.0] PASSED [ 49%]
tests/test_devops.py::test_finalize_changelog_rejects_a_malformed_version[v0.2.0] PASSED [ 50%]
tests/test_devops.py::test_finalize_changelog_rejects_a_malformed_version[0.2.0-pre] PASSED [ 52%]
tests/test_devops.py::test_finalize_changelog_rejects_a_malformed_version[abc] PASSED [ 54%]
tests/test_devops.py::test_release_refuses_a_rewrite_that_cannot_match_before_changing_anything PASSED [ 55%]
tests/test_devops.py::test_release_restores_the_files_when_a_rewrite_fails_midway PASSED [ 57%]
tests/test_devops.py::test_second_phase_failure_names_the_local_commits_and_pushes_nothing PASSED [ 59%]
tests/test_devops.py::test_a_rejected_push_is_atomic_and_leaves_the_tag_off_origin PASSED [ 61%]
tests/test_devops.py::test_preflight_refuses_a_plan_branch_behind_origin PASSED [ 62%]
tests/test_devops.py::test_release_refuses_a_missing_gh_before_changing_anything PASSED [ 64%]
tests/test_devops.py::test_a_failed_github_release_is_listed_after_the_push PASSED [ 66%]
tests/test_devops.py::test_a_rejected_plan_push_is_listed_and_the_other_steps_still_run PASSED [ 67%]
tests/test_devops.py::test_a_failed_pin_is_listed_after_the_push PASSED  [ 69%]
tests/test_devops.py::test_a_dirty_backend_is_refused_before_any_local_change PASSED [ 71%]
tests/test_devops.py::test_a_backend_without_a_branch_is_refused PASSED  [ 72%]
tests/test_devops.py::test_the_plan_lists_commits_that_the_push_publishes_too PASSED [ 74%]
tests/test_devops.py::test_the_changelog_must_hold_bullets_and_a_strict_pre_suffix PASSED [ 76%]
tests/test_devops.py::test_a_failing_check_run_changes_nothing PASSED    [ 77%]
tests/test_devops.py::test_a_dry_run_runs_the_checks_unless_they_are_skipped PASSED [ 79%]
tests/test_devops.py::test_release_refuses_when_the_tree_changes_during_the_checks PASSED [ 81%]
tests/test_devops.py::test_release_treats_a_closed_input_as_not_confirmed PASSED [ 83%]
tests/test_devops.py::test_release_keeps_crlf_line_endings PASSED        [ 84%]
tests/test_devops.py::test_update_backend_pin_restores_the_file_when_the_commit_fails PASSED [ 86%]
tests/test_devops.py::test_update_backend_pin_skips_a_pin_that_is_already_current PASSED [ 88%]
tests/test_devops.py::test_cli_rejects_bad_arguments_with_exit_code_2[args0] PASSED [ 89%]
tests/test_devops.py::test_cli_rejects_bad_arguments_with_exit_code_2[args1] PASSED [ 91%]
tests/test_devops.py::test_cli_rejects_bad_arguments_with_exit_code_2[args2] PASSED [ 93%]
tests/test_devops.py::test_cli_rejects_bad_arguments_with_exit_code_2[args3] PASSED [ 94%]
tests/test_devops.py::test_cli_rejects_bad_arguments_with_exit_code_2[args4] PASSED [ 96%]
tests/test_devops.py::test_release_keeps_a_crlf_working_tree_with_lf_in_the_repository PASSED [ 98%]
tests/test_devops.py::test_an_interrupt_while_editing_restores_the_files_and_names_the_state PASSED [100%]

======================== 59 passed in 98.87s (0:01:38) ========================
```

### Lint action

Command: `python scripts/devops.py lint`
Exit code: 0

```text
[*] C:\Program Files\nodejs\npm.CMD run lint

> todos-webapp@0.1.3-pre lint
> eslint .

[*] C:\Program Files\Python312\Scripts\ruff.EXE check scripts tests
All checks passed!
[*] C:\Program Files\Python312\Scripts\ruff.EXE format --check scripts tests
5 files already formatted
```

### Test action

Command: `python scripts/devops.py test`
Exit code: 0

```text
[*] C:\Program Files\nodejs\npm.CMD test

> todos-webapp@0.1.3-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  37 passed (37)
      Tests  751 passed (751)
   Start at  11:01:09
   Duration  12.86s (environment 70%, tests 19%, import 8%, transform 2%, worker 2%)

    Isolate  37 workers spawned · ~1.69s startup each (spawn + environment, per file)
             at least ~7.25s faster with isolate: false — reuses workers across files instead of one per file

[*] C:\Program Files\Python312\python.exe -m pytest -q tests
........................................................................ [ 61%]
.............................................                            [100%]
117 passed in 121.85s (0:02:01)
```

### Release dry run on this repository
It checks the preconditions, prints the plan, and changes nothing.

Command: `python scripts/devops.py release 0.2.0 --dry-run --backend-dir ../todos`
Exit code: 0

```text
Release         : v0.2.0, dated 2026-11-07
Next version    : v0.2.1-pre
Commits         : 'Released v0.2.0.', then 'Opened v0.2.1-pre development after releasing v0.2.0.'
Files           : CHANGELOG.md, package.json, package-lock.json, src/js/version.js, src/service-worker.js, scripts/sw-precache-hashes.json
Checks          : service worker, unit, lint, e2e, Ruff, pytest
Commands that publish:
  git push origin main v0.2.0
  git push origin plan
  gh release create v0.2.0 --title v0.2.0 --notes {{changelog entry}}
Backend pin     : todosWebappVersion=0.2.0 in ../todos; committed locally, never pushed or deployed

Dry run: nothing was changed.
```

### Entry point: version line and an invalid action
The first exit code is for `version`, the second for the invalid action `deploy` (2 = invalid arguments).

Command: `python scripts/devops.py version; python scripts/devops.py deploy`
Exit code: 2

```text
devops v0.1.3-pre - Copyright (c) Giovanni Pellicciotta
exit: 0
usage: devops [-h] [-v] [--verbose] [--dry-run] [--skip-checks] [--yes]
              [--no-github-release] [--backend-dir BACKEND_DIR]
              [{lint,test,e2e,check,release,version,help}] [release_version]
devops: error: argument action: invalid choice: 'deploy' (choose from lint, test, e2e, check, release, version, help)
```
