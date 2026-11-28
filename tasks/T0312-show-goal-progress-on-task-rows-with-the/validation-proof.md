## Walkthrough & Validation

### Failing tests before the implementation
Command: `npx vitest run tests/unit/quick-log.test.js tests/unit/task-list.test.js` (exit code 1)

```text
FAIL  tests/unit/quick-log.test.js [ tests/unit/quick-log.test.js ]
Error: Failed to resolve import "../../src/js/views/quick-log.js" from "tests/unit/quick-log.test.js". Does the file exist?
FAIL  tests/unit/task-list.test.js > clickOf > completes open tasks at target 1, and leaves completed and cancelled ones alone (TSK-4)
TypeError: clickOf is not a function
 Test Files  2 failed (2)
      Tests  33 failed | 55 passed (88)
```

### Unit suite after the implementation
Command: `npx vitest run` (exit code 0)

```text
 Test Files  74 passed (74)
      Tests  2137 passed (2137)
```

### Lint
Command: `npx eslint .` (exit code 0, no output)

### End-to-end suite
Command: `npx playwright test` (exit code 0)

```text
  301 passed (4.1m)
```

New end-to-end test: `tests/e2e/list.spec.js` "logs from a row past an at-most limit, shows the marks, and undoes the entry from the toast".

### Screenshots
Captured with `node t0312-capture.mjs` against the base commit (before) and the task branch (after), 1440x900, en-US.
- Lists: [before light](list-before-light.png), [after light](list-after-light.png), [before dark](list-before-dark.png), [after dark](list-after-dark.png)
- View options, Status row open: [before light](view-options-before-light.png), [after light](view-options-after-light.png), [before dark](view-options-before-dark.png), [after dark](view-options-after-dark.png)
- Quick log open under Sport: [light](quick-log-after-light.png), [dark](quick-log-after-dark.png)
