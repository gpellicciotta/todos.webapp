## Walkthrough & Validation

### Summary
- `dialog.js`, `toast.js`, and `live-region.js` were written during T0010 and moved here in the split.
- The gallery's `[data-open-dialog]` handler now calls `openDialog`, from `visual-style-gallery-behaviors.js` instead of `visual-style-gallery.js`.
- The Toast section gained a working toast with Undo, in a toast region placed right after its button.
- T0030's end-to-end tests live in `tests/e2e/behaviors-dialog.spec.js`, apart from T0010's `behaviors.spec.js`.

### Red Phase
The unit tests ran during T0010, before any module existed, so each T0030 suite failed to import its module.
The run also covered T0010's menu suite; its lines are cut below.

Command: `npx vitest run tests/unit/menu.test.js tests/unit/toast.test.js tests/unit/dialog.test.js tests/unit/live-region.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/toast.test.js (0 test)
 ❯ tests/unit/live-region.test.js (0 test)
 ❯ tests/unit/dialog.test.js (0 test)
[... truncated: the menu.test.js line and the Failed Suites rule ...]
 FAIL  tests/unit/dialog.test.js [ tests/unit/dialog.test.js ]
Error: Failed to resolve import "../../src/js/ui/menu.js" from "tests/unit/dialog.test.js". Does the file exist?
  Plugin: vite:import-analysis
[... truncated: the code frame and stack frames ...]
 FAIL  tests/unit/live-region.test.js [ tests/unit/live-region.test.js ]
Error: Failed to resolve import "../../src/js/ui/live-region.js" from "tests/unit/live-region.test.js". Does the file exist?
  Plugin: vite:import-analysis
[... truncated: the code frame, stack frames, and the menu.test.js failure block of T0010 ...]
 FAIL  tests/unit/toast.test.js [ tests/unit/toast.test.js ]
Error: Failed to resolve import "../../src/js/ui/toast.js" from "tests/unit/toast.test.js". Does the file exist?
  Plugin: vite:import-analysis
[... truncated: the code frame and stack frames ...]

 Test Files  4 failed (4)
      Tests  no tests
   Start at  15:50:13
   Duration  1.55s (environment 99%, worker 1%)

```

The end-to-end tests ran before the wiring: the modal let Tab leave it, and the toast specimen did not exist.
The sheet test passed already, since `controls.css` styled compact modals before this task.

Command: `E2E_PORT=8795 NO_COLOR=1 env -u FORCE_COLOR npx playwright test tests/e2e/behaviors-dialog.spec.js` (exit code 1)

```text
[... truncated: repeated Node.js NO_COLOR and FORCE_COLOR warnings ...]
Running 5 tests using 4 workers

  ok 4 [chromium] › tests\e2e\behaviors-dialog.spec.js:65:3 › dialog behavior › the modal fills the viewport height as a sheet at 390 px (882ms)
  x  2 [chromium] › tests\e2e\behaviors-dialog.spec.js:29:3 › dialog behavior › keyboard alone opens the modal, keeps Tab inside, and closes it with Escape and a button (6.2s)
  x  3 [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes (30.8s)
  x  1 [chromium] › tests\e2e\behaviors-dialog.spec.js:99:3 › toast behavior › Escape inside a toast dismisses it and returns focus (30.8s)
  x  5 [chromium] › tests\e2e\behaviors-dialog.spec.js:111:3 › toast behavior › a toast expires after 8 seconds (30.4s)
[... truncated: two blank lines ...]
  1) [chromium] › tests\e2e\behaviors-dialog.spec.js:29:3 › dialog behavior › keyboard alone opens the modal, keeps Tab inside, and closes it with Escape and a button 

    Error: Tab wraps to the first control

    expect(locator).toBeFocused() failed

    Locator:  locator('#dialog-modal').getByRole('button', { name: 'Cancel' })
    Expected: focused
    Received: inactive
    Timeout:  5000ms
[... truncated: the call log ...]
      43 |     await expect(confirm).toBeFocused();
      44 |     await page.keyboard.press('Tab');
    > 45 |     await expect(cancel, 'Tab wraps to the first control').toBeFocused();
         |                                                            ^
[... truncated: the trace attachment and the three toast failure blocks, which time out waiting for the specimen ...]

  4 failed
    [chromium] › tests\e2e\behaviors-dialog.spec.js:29:3 › dialog behavior › keyboard alone opens the modal, keeps Tab inside, and closes it with Escape and a button 
    [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes 
    [chromium] › tests\e2e\behaviors-dialog.spec.js:99:3 › toast behavior › Escape inside a toast dismisses it and returns focus 
    [chromium] › tests\e2e\behaviors-dialog.spec.js:111:3 › toast behavior › a toast expires after 8 seconds 
  1 passed (33.6s)
```

### Green Phase
Unit tests of the three modules:

Command: `npx vitest run tests/unit/toast.test.js tests/unit/dialog.test.js tests/unit/live-region.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  3 passed (3)
      Tests  26 passed (26)
   Start at  16:29:13
   Duration  1.16s (environment 91%, tests 5%, import 2%, transform 1%, worker 1%)

```

One full end-to-end run failed the expiry test: the installed clock flowed in real time until paused.
The test now pauses the clock first, and 25 repeated runs passed.

Command: `E2E_PORT=8795 NO_COLOR=1 env -u FORCE_COLOR npx playwright test tests/e2e/behaviors-dialog.spec.js` (exit code 0)

```text

Running 5 tests using 4 workers

  ok 1 [chromium] › tests\e2e\behaviors-dialog.spec.js:99:3 › toast behavior › Escape inside a toast dismisses it and returns focus (1.3s)
  ok 2 [chromium] › tests\e2e\behaviors-dialog.spec.js:65:3 › dialog behavior › the modal fills the viewport height as a sheet at 390 px (1.2s)
  ok 4 [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes (1.4s)
  ok 3 [chromium] › tests\e2e\behaviors-dialog.spec.js:29:3 › dialog behavior › keyboard alone opens the modal, keeps Tab inside, and closes it with Escape and a button (1.9s)
  ok 5 [chromium] › tests\e2e\behaviors-dialog.spec.js:111:3 › toast behavior › a toast expires after 8 seconds (752ms)

  5 passed (3.6s)
```

Completion check, part 1:

Command: `NO_COLOR=1 npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run
[... truncated: the RUN header and blank lines ...]
 Test Files  15 passed (15)
      Tests  434 passed (434)
   Start at  16:27:06
   Duration  2.38s (environment 54%, tests 24%, import 17%, transform 3%, worker 2%)
[... truncated: the Vitest isolate hint ...]
```

Completion check, part 2:

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .

```

Completion check, part 3:

Command: `E2E_PORT=8795 NO_COLOR=1 env -u FORCE_COLOR npm run test:e2e` (exit code 0)

```text

> todos-webapp@0.1.0-pre test:e2e
> playwright test


Running 55 tests using 4 workers

  ok  1 [chromium] › tests\e2e\behaviors-dialog.spec.js:65:3 › dialog behavior › the modal fills the viewport height as a sheet at 390 px (1.1s)
  ok  3 [chromium] › tests\e2e\behaviors-dialog.spec.js:99:3 › toast behavior › Escape inside a toast dismisses it and returns focus (1.1s)
  ok  4 [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes (1.2s)
  ok  2 [chromium] › tests\e2e\behaviors-dialog.spec.js:29:3 › dialog behavior › keyboard alone opens the modal, keeps Tab inside, and closes it with Escape and a button (1.9s)
  ok  5 [chromium] › tests\e2e\behaviors-dialog.spec.js:111:3 › toast behavior › a toast expires after 8 seconds (1.1s)
[... truncated: 50 passing lines of the other specs, including behaviors.spec.js ...]

  55 passed (34.8s)
```
