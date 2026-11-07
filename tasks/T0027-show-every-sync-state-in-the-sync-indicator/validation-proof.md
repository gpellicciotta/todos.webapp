# T0027 validation proof

## Red run (before implementation)

```
$ npx vitest run tests/unit/sync-indicator.test.js tests/unit/sync-log-view.test.js tests/unit/push.test.js tests/unit/layout.test.js
 FAIL  tests/unit/sync-indicator.test.js [ tests/unit/sync-indicator.test.js ]
Error: Failed to resolve import "../../src/js/views/sync-indicator.js" from "tests/unit/sync-indicator.test.js". Does the file exist?
 FAIL  tests/unit/sync-log-view.test.js [ tests/unit/sync-log-view.test.js ]
Error: Failed to resolve import "../../src/js/views/sync-log.js" from "tests/unit/sync-log-view.test.js". Does the file exist?
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/layout.test.js > renderShell navigation > puts the sync indicator before the bell and the user button, and the session banner above the views
TypeError: shell.showSync is not a function
 FAIL  tests/unit/push.test.js > handling replies > reports the time of the last sync and the detail of an error for the sync indicator
AssertionError: expected { status: 'error', pending: 1, …(3) } to match object { status: 'error', lastSync: null }
 Test Files  4 failed (4)
      Tests  2 failed | 26 passed (28)
```

## Completion check

```
$ npm test && npm run lint && npm run test:e2e
 Test Files  53 passed (53)
      Tests  1069 passed (1069)
npm run lint: exit 0
  ✓  178 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (2.2s)

  178 passed (1.7m)
117 passed in 83.56s (0:01:23)
OK: 70 precached files match VERSION 2026-11-07.24.
```

## Screenshots

- before indicator 390 light: [before](screenshots/before-indicator-390-light.png) · after: [after](screenshots/after-indicator-390-light.png)
- before sync-log 390 light: [before](screenshots/before-sync-log-390-light.png) · after: [after](screenshots/after-sync-log-390-light.png)
- before indicator 390 dark: [before](screenshots/before-indicator-390-dark.png) · after: [after](screenshots/after-indicator-390-dark.png)
- before sync-log 390 dark: [before](screenshots/before-sync-log-390-dark.png) · after: [after](screenshots/after-sync-log-390-dark.png)
- before indicator 1440 light: [before](screenshots/before-indicator-1440-light.png) · after: [after](screenshots/after-indicator-1440-light.png)
- before sync-log 1440 light: [before](screenshots/before-sync-log-1440-light.png) · after: [after](screenshots/after-sync-log-1440-light.png)
- before indicator 1440 dark: [before](screenshots/before-indicator-1440-dark.png) · after: [after](screenshots/after-indicator-1440-dark.png)
- before sync-log 1440 dark: [before](screenshots/before-sync-log-1440-dark.png) · after: [after](screenshots/after-sync-log-1440-dark.png)
