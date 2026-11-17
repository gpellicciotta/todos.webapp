## Walkthrough & Validation

Cause: each Lists open re-read 5000 tasks and every membership to count them, though the sidebar had just done so.
Fix: `core/list-snapshot.js` shares one cached read until the next store write or the minute timer.

### Before: 150-list test fails (`npx playwright test --config playwright.perf.config.js -g "Lists opens"`, exit 1)
```
    Expected: < 200
    Received:   389.2000000178814
  1 failed
  2 passed (59.6s)
```

### Unit test fails before the view uses the snapshot (`npx vitest run tests/unit/list-snapshot.test.js`, exit 1)
```
 ❯ tests/unit/list-snapshot.test.js:75:23
     75|     expect(reads).not.toHaveBeenCalled();
 Tests  1 failed | 4 passed (5)
```

### After: `npx vitest run` (exit 0) and `npx eslint .` (exit 0, no output)
```
 Test Files  65 passed (65)
      Tests  1677 passed (1677)
```

### After: `npm run check:sw` (exit 0)
```
OK: 131 precached files match VERSION 2026-11-17.19.
```

### After: Lists perf tests (exit 0)
```
4x CPU throttling, 150 lists: Lists open 161, 165, 175 ms (median 165 ms)
4x CPU throttling, 500 lists: Lists open 392, 366, 353 ms (median 366 ms)
  3 passed (51.8s)
```

### Lists e2e (`npx playwright test tests/e2e/lists.spec.js tests/e2e/lists-many-rows.spec.js tests/e2e/lists-find.spec.js`, exit 0)
```
  20 passed (28.1s)
```

### Review round 1: intermittent Back scroll restore failure is not a regression
Review saw `lists-many-rows.spec.js:81` fail once: `scrollTop > 11234`, received `10958`.
Under load the check fails on this branch and on base commit e173243 alike, always at `10958`.
The restore clamps to the content height before off-screen rows have their real heights; follow-up task T0271.

Command on each checkout: `npx playwright test tests/e2e/lists-many-rows.spec.js --grep "a Back" --repeat-each 80 --workers 8` (exit 1 both)
```text
This branch (0932d14):  Received: 10958 ... 34 failed, 46 passed (5.8m)
Base (e173243):         Received: 10958 ... 23 failed, 57 passed (5.4m)
```

Affected suite, normal parallel run, repeated: `npx playwright test tests/e2e/lists-many-rows.spec.js tests/e2e/lists.spec.js tests/e2e/lists-find.spec.js --repeat-each 6` (exit 0 on the second run; 1 failed of 120 on the first)
```text
  120 passed (2.6m)
```

### Known failures unrelated to this task
Two All tasks perf tests fail on this machine with and without the change (base commit e173243: view open median 302 ms; grouped 282 ms).
```
4x CPU throttling: view open 254, 254, 259 ms (median 254 ms)
grouped by due date, 4x CPU throttling: view open 277, 275, 297 ms (median 277 ms)
  2 failed
```
