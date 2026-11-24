## Walkthrough & Validation

### Summary
- `renderShell` attaches one vendored `attachLabelTooltips` controller to the shell root for `.icon-button, .fab`.
- Its `when` skips controls with a `title`, so hint titles (task status, Add, editor status) keep the native title.
- The inbox bell drops the `title` the vendored `setCount` writes; the Lists New list button drops its `title`.
- `shell.destroy()` destroys the controller and removes its tooltip element.

### Screenshots
- Before, hovered "All tasks actions" shows nothing: [before-hover.png](before-hover.png)
- After, hovered "All tasks actions" shows a label tooltip: [after-hover.png](after-hover.png)

### Failing tests on main (before the implementation)
Command: `npx vitest run tests/unit/layout.test.js tests/unit/lists.test.js tests/unit/inbox-ui.test.js`
Exit code: 1. Output filtered with `grep -E "✓|×|FAIL|Tests|expected|Error"`.

```text
     × keeps no native title on the bell, whose name the shell label tooltip shows 19ms
     × names a hovered icon button with one shared label tooltip 17ms
     × names a floating button in the overlay layer 7ms
     × removes its tooltip when the shell is destroyed 6ms
     × offers New list as a floating plus button that links to the new list editor 47ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/inbox-ui.test.js > inbox button > keeps no native title on the bell, whose name the shell label tooltip shows
AssertionError: expected true to be false // Object.is equality
 FAIL  tests/unit/layout.test.js > renderShell label tooltips > names a hovered icon button with one shared label tooltip
AssertionError: expected [] to deeply equal [ 'Collapse navigation' ]
 FAIL  tests/unit/layout.test.js > renderShell label tooltips > names a floating button in the overlay layer
AssertionError: expected [] to deeply equal [ 'New list' ]
 FAIL  tests/unit/layout.test.js > renderShell label tooltips > removes its tooltip when the shell is destroyed
TypeError: shell.destroy is not a function
 FAIL  tests/unit/lists.test.js > mountLists > offers New list as a floating plus button that links to the new list editor
AssertionError: expected true to be false // Object.is equality
      Tests  5 failed | 99 passed (104)
```

The "skips a control whose title holds a hint" unit test and the status-button e2e test pass on main by design.
They guard the hint titles against the new controller.

Command: `npx playwright test tests/e2e/shell.spec.js -g "label tooltip|native hint title" --reporter=line`
Exit code: 1.

```text
  1) [chromium] › tests\e2e\shell.spec.js:260:1 › an icon button shows its name in a label tooltip on hover and on focus, without a native title 
    Error: expect(locator).toHaveCount(expected) failed
    Locator:  locator('.tooltip--label:visible')
    Expected: 1
    Received: 0
    Timeout:  5000ms
  1 failed
    [chromium] › tests\e2e\shell.spec.js:260:1 › an icon button shows its name in a label tooltip on hover and on focus, without a native title 
  2 passed (9.3s)
```

### Completion check after the implementation
Command: `python scripts/devops.py check`
Exit code: 0.

```text
Command: "C:\Program Files\nodejs\node.EXE" scripts/check-sw-version.mjs
Process ID: 31288
OK: 157 precached files match VERSION 2026-11-24.8.
Command: "C:\Program Files\nodejs\node.EXE" src/vendor/design/bin/check.mjs
Process ID: 30956
integrity: PASS
conformance: PASS
Command: "C:\Program Files\nodejs\npm.CMD" test
Process ID: 28116
> todos-webapp@0.5.1-pre test
> vitest run
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0292-name-icon-buttons-on-hover-and-focus-with
 Test Files  68 passed (68)
      Tests  1814 passed (1814)
   Start at  15:03:15
   Duration  19.45s (tests 45%, environment 39%, import 9%, transform 4%, worker 1%, setup 1%)
    Isolate  68 workers spawned · ~909ms startup each (spawn + environment, per file)
             at least ~7.92s faster with isolate: false — reuses workers across files instead of one per file
Command: "C:\Program Files\nodejs\npm.CMD" run lint
Process ID: 10248
> todos-webapp@0.5.1-pre lint
> eslint .
Command: "C:\Program Files\nodejs\npm.CMD" run test:e2e
Process ID: 8076
[... 281 e2e result lines omitted ...]
  278 passed (3.7m)
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff check scripts tests
Process ID: 18404
All checks passed!
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff format --check scripts tests
Process ID: 23228
4 files already formatted
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
Process ID: 36784
........................................................................ [ 33%]
........................................................................ [ 66%]
.......................................................................  [100%]
215 passed in 112.28s (0:01:52)
```
