## Walkthrough & Validation

### Key Changes
- Rules and occurrences hold only `goal-target` and `progress`; `fullRules` and `fullOccurrence` replace the mirror helpers.
- The in-place event fold, rule edits, views, sync merge, queue rollbacks, and backups read the goal fields.
- Legacy names are read only at the edges: version 5 data, format 2 backups, older service rows, stored rule edit details, and queued changes.
- A reading goal without a reading keeps a null `progress`, as local-store.md specifies.
- The service worker VERSION moved to `2026-11-28.17`; the hash manifest at HEAD was already stale for untouched files.
- No visual change: the views read other field names and render the same output, which the e2e suite covers.

### Red Phase
New tests in `tests/unit/goal-fields.test.js`, before the implementation.

Command: `npx vitest run tests/unit/goal-fields.test.js 2>&1 | Select-String -Pattern "✓|×|FAIL|Tests |AssertionError|is not a function|SyntaxError" | Select-Object -First 30` (exit code 1)

```text
 ❯ tests/unit/goal-fields.test.js (6 tests | 6 failed) 46ms
     × keeps them out of the default rules and of a new occurrence 11ms
     × folds an event on the goal target and progress alone 4ms
     × reads the legacy counts of an old record into the goal fields, and drops them 1ms
     × reads a target-count rule edit of a stored event as a goal-target edit 1ms
     × writes tasks and occurrences with only the goal fields 15ms
     × rolls back a rule change queued before the upgrade, whose undo data names target-count 12ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/goal-fields.test.js > records without the legacy counts > keeps them out of the default rules and of 
a new occurrence
AssertionError: expected [ 'target-count' ] to deeply equal []
 FAIL  tests/unit/goal-fields.test.js > records without the legacy counts > folds an event on the goal target and 
progress alone
AssertionError: expected { occurrence: 1, …(12) } to match object { 'goal-target': 2, progress: 2, …(1) }
 FAIL  tests/unit/goal-fields.test.js > records without the legacy counts > reads the legacy counts of an old record 
into the goal fields, and drops them
TypeError: fullRules is not a function
 FAIL  tests/unit/goal-fields.test.js > records without the legacy counts > reads a target-count rule edit of a stored 
event as a goal-target edit
AssertionError: expected { 'target-count': 4 } to deeply equal { 'goal-target': 4 }
 FAIL  tests/unit/goal-fields.test.js > the store without the legacy counts > writes tasks and occurrences with only 
the goal fields
AssertionError: expected { occurrence: 1, …(13) } to match object { 'goal-target': 2, progress: 1, …(1) }
 FAIL  tests/unit/goal-fields.test.js > the store without the legacy counts > rolls back a rule change queued before 
the upgrade, whose undo data names target-count
AssertionError: expected 1 to be 2 // Object.is equality
 Test Files  1 failed (1)
      Tests  6 failed (6)
   Duration  488ms (import 42%, transform 30%, tests 20%, setup 5%, worker 3%)
```

The seventh test, the null progress of a reading goal, was added after the implementation.

### Green Phase
Command: `python scripts/devops.py check` (exit code 0)

```text
Command: "C:\Program Files\nodejs\node.EXE" scripts/check-sw-version.mjs
[... 1 lines omitted ...]
OK: 167 precached files match VERSION 2026-11-28.17.
Command: "C:\Program Files\nodejs\node.EXE" src/vendor/design/bin/check.mjs
[... 1 lines omitted ...]
integrity: PASS
conformance: PASS
Command: "C:\Program Files\nodejs\npm.CMD" test
[... 1 lines omitted ...]
> todos-webapp@0.6.1-pre test
> vitest run
[... 1 lines omitted ...]
 Test Files  75 passed (75)
      Tests  2164 passed (2164)
[... 4 lines omitted ...]
Command: "C:\Program Files\nodejs\npm.CMD" run lint
[... 1 lines omitted ...]
> todos-webapp@0.6.1-pre lint
> eslint .
Command: "C:\Program Files\nodejs\npm.CMD" run test:e2e
[... 1 lines omitted ...]
> todos-webapp@0.6.1-pre test:e2e
> playwright test
[... 2 lines omitted ...]
Running 303 tests using 4 workers
[... 319 lines omitted ...]
  303 passed (3.9m)
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff check scripts tests
[... 1 lines omitted ...]
All checks passed!
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff format --check scripts tests
[... 1 lines omitted ...]
4 files already formatted
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
[... 5 lines omitted ...]
271 passed in 98.24s (0:01:38)
```

### Not Run
- `npm run test:contract` needs a built todos server from the sibling `todos.server` repository, which this task leaves untouched.
  Its legacy field names were updated to the goal fields, unverified against a server.
