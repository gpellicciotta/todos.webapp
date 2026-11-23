## Walkthrough & Validation

### Before: the three failures on the global support-python 3.1.0
`python -m pytest tests/test_devops.py -q`, exit 1:

```text
FAILED tests/test_devops.py::test_cli_release_dry_run_in_a_scratch_project_changes_nothing
FAILED tests/test_devops.py::test_the_release_action_runs_the_project_release_override_with_every_option
FAILED tests/test_devops.py::test_the_release_action_keeps_no_github_release_as_an_alias
3 failed, 85 passed in 94.47s (0:01:34)
```

The dry run output, from the first failure:

```text
[*] C:\Program Files\nodejs\node.EXE scripts/check-sw-version.mjs
ERROR: VERSION moved from 2026-11-17.41 to 2026-01-01.1 but the manifest was not updated.
**[ERROR]** The checks failed; nothing was changed.
**[WARN]**  --skip-checks has no effect on a project with its own release.
```

### Root cause check: unchanged code on the v3.3.0 sources
`$env:PYTHONPATH = "C:/Dev-Projects/support.python/src"; python -m pytest tests/test_devops.py -q -k release`, exit 0:

```text
22 passed, 66 deselected in 30.56s
```

### New test fails before the fix, even on v3.3.0
`python -m pytest tests/test_devops.py -q -k forwards_only_some` with the v3.3.0 `PYTHONPATH`, exit 1:

```text
E         At index 0 diff: False != True
tests\test_devops.py:618: AssertionError
FAILED tests/test_devops.py::test_the_release_action_keeps_every_option_when_devops_cli_forwards_only_some
1 failed, 88 deselected in 3.42s
```

### After the fix
`python -m pytest tests/test_devops.py -q` on the global 3.1.0, exit 0:

```text
89 passed in 86.13s (0:01:26)
```

The same with `$env:PYTHONPATH = "C:/Dev-Projects/support.python/src"` (v3.3.0), exit 0:

```text
89 passed in 81.59s (0:01:21)
```

`python -m pytest -q tests`, exit 0:

```text
190 passed in 83.89s (0:01:23)
```

`python -m ruff check scripts tests; python -m ruff format --check scripts tests`, exit 0:

```text
All checks passed!
4 files already formatted
```
