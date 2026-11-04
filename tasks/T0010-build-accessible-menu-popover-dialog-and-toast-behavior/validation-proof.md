## Walkthrough & Validation

### Red Phase
The unit tests ran before any module under `src/js/ui/` existed, so every suite failed to import its module.

Command: `npx vitest run tests/unit/menu.test.js tests/unit/toast.test.js tests/unit/dialog.test.js tests/unit/live-region.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/toast.test.js (0 test)
 ❯ tests/unit/live-region.test.js (0 test)
 ❯ tests/unit/dialog.test.js (0 test)
 ❯ tests/unit/menu.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/dialog.test.js [ tests/unit/dialog.test.js ]
Error: Failed to resolve import "../../src/js/ui/menu.js" from "tests/unit/dialog.test.js". Does the file exist?
  Plugin: vite:import-analysis
[... truncated: stack frames, then the same "Failed to resolve import" error for live-region.js, menu.js, and toast.js ...]

 Test Files  4 failed (4)
      Tests  no tests
   Start at  15:50:13
   Duration  1.55s (environment 99%, worker 1%)

```

### Green Phase
Unit tests after implementing the menu, popover, dialog, toast, and live region modules:

Command: `npx vitest run tests/unit/menu.test.js tests/unit/toast.test.js tests/unit/dialog.test.js tests/unit/live-region.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  4 passed (4)
      Tests  50 passed (50)
   Start at  15:53:36
   Duration  1.50s (environment 91%, tests 5%, import 2%, worker 1%, transform 1%)

```

Command: `npx eslint src/js/ui tests/unit` (exit code 0)

```text
```
