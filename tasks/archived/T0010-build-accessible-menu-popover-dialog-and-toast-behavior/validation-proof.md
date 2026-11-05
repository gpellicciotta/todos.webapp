## Walkthrough & Validation

### Summary
- `popover.js` anchors a non-modal panel to its trigger; `menu.js` builds menu buttons on it.
- The gallery's Menu and Popover sections gained working specimens, wired by `visual-style-gallery-behaviors.js`.
- `controls.css` now hides `.menu[hidden]` and `.popover[hidden]`, which their `display: grid` rules had overridden.

### Red Phase
The unit tests ran before `src/js/ui/menu.js` and `src/js/ui/popover.js` existed, so the menu suite failed to import them.
This run predates the split into T0030 and also covered that task's suites; their lines are cut below.

Command: `npx vitest run tests/unit/menu.test.js tests/unit/toast.test.js tests/unit/dialog.test.js tests/unit/live-region.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/menu.test.js (0 test)
[... truncated: the matching lines and failure blocks of the T0030 suites ...]
 FAIL  tests/unit/menu.test.js [ tests/unit/menu.test.js ]
Error: Failed to resolve import "../../src/js/ui/menu.js" from "tests/unit/menu.test.js". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Dev-Projects/todos.webapp/tests/unit/menu.test.js:3:28
  1  |  // @vitest-environment happy-dom
  2  |  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
  3  |  import { attachMenu } from '../../src/js/ui/menu.js';
     |                              ^
  4  |  import { attachPopover } from '../../src/js/ui/popover.js';
  5  |  
[... truncated: stack frames and the toast.test.js failure block of T0030 ...]

 Test Files  4 failed (4)
      Tests  no tests
   Start at  15:50:13
   Duration  1.55s (environment 99%, worker 1%)

```

The end-to-end tests ran before the gallery had working specimens, so every test failed to find them.

Command: `E2E_PORT=8795 NO_COLOR=1 npx playwright test tests/e2e/behaviors.spec.js` (exit code 1)

```text
Running 5 tests using 4 workers

[... truncated: repeated Node.js NO_COLOR and FORCE_COLOR warnings ...]
  x  1 [chromium] › tests\e2e\behaviors.spec.js:29:3 › menu behavior › keyboard alone opens, moves through, selects in, and closes the working menu (5.9s)
  x  2 [chromium] › tests\e2e\behaviors.spec.js:83:3 › menu behavior › an outside click closes the menu and returns focus to the trigger (30.2s)
  x  3 [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it (30.3s)
  x  4 [chromium] › tests\e2e\behaviors.spec.js:93:3 › menu behavior › the menu opens anchored below its trigger inside a 390 px viewport (30.3s)
  x  5 [chromium] › tests\e2e\behaviors.spec.js:153:3 › popover behavior › an outside click closes the popover (30.2s)


  1) [chromium] › tests\e2e\behaviors.spec.js:29:3 › menu behavior › keyboard alone opens, moves through, selects in, and closes the working menu 

    Error: expect(locator).toHaveAttribute(expected) failed

    Locator: locator('#menu-demo-trigger')
    Expected: "menu"
    Timeout: 5000ms
    Error: element(s) not found

    Call log:
      - Expect "toHaveAttribute" locator('#menu-demo-trigger') with timeout 5000ms
      - waiting for locator('#menu-demo-trigger')

[... truncated: the code frame and the four other failure blocks, which time out waiting for the specimens ...]
  5 failed
    [chromium] › tests\e2e\behaviors.spec.js:29:3 › menu behavior › keyboard alone opens, moves through, selects in, and closes the working menu 
    [chromium] › tests\e2e\behaviors.spec.js:83:3 › menu behavior › an outside click closes the menu and returns focus to the trigger 
    [chromium] › tests\e2e\behaviors.spec.js:93:3 › menu behavior › the menu opens anchored below its trigger inside a 390 px viewport 
    [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it 
    [chromium] › tests\e2e\behaviors.spec.js:153:3 › popover behavior › an outside click closes the popover 
```

### Green Phase
Menu and popover unit tests after implementing both modules:

Command: `npx vitest run tests/unit/menu.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  15:55:33
   Duration  966ms (environment 87%, tests 8%, import 3%, transform 2%, worker 1%)

```

The first end-to-end run after wiring failed: closed menus stayed visible until `controls.css` honored `hidden`.

Command: `E2E_PORT=8795 NO_COLOR=1 env -u FORCE_COLOR npx playwright test tests/e2e/behaviors.spec.js` (exit code 0)

```text

Running 5 tests using 4 workers

  ok 1 [chromium] › tests\e2e\behaviors.spec.js:93:3 › menu behavior › the menu opens anchored below its trigger inside a 390 px viewport (1.2s)
  ok 2 [chromium] › tests\e2e\behaviors.spec.js:83:3 › menu behavior › an outside click closes the menu and returns focus to the trigger (1.3s)
  ok 3 [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it (2.0s)
  ok 5 [chromium] › tests\e2e\behaviors.spec.js:153:3 › popover behavior › an outside click closes the popover (927ms)
  ok 4 [chromium] › tests\e2e\behaviors.spec.js:29:3 › menu behavior › keyboard alone opens, moves through, selects in, and closes the working menu (2.1s)

  5 passed (3.7s)
```

Completion check, part 1:

Command: `NO_COLOR=1 npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run
[... truncated: the RUN header and blank lines ...]
 Test Files  15 passed (15)
      Tests  434 passed (434)
   Start at  16:23:05
   Duration  2.33s (environment 52%, tests 24%, import 18%, transform 3%, worker 2%)
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


Running 50 tests using 4 workers

  ok  2 [chromium] › tests\e2e\behaviors.spec.js:93:3 › menu behavior › the menu opens anchored below its trigger inside a 390 px viewport (1.2s)
  ok  1 [chromium] › tests\e2e\behaviors.spec.js:83:3 › menu behavior › an outside click closes the menu and returns focus to the trigger (1.4s)
  ok  5 [chromium] › tests\e2e\behaviors.spec.js:153:3 › popover behavior › an outside click closes the popover (1.0s)
  ok  4 [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it (2.1s)
  ok  3 [chromium] › tests\e2e\behaviors.spec.js:29:3 › menu behavior › keyboard alone opens, moves through, selects in, and closes the working menu (2.2s)
[... truncated: 45 passing lines of the other gallery and app specs ...]

  50 passed (32.6s)
```
