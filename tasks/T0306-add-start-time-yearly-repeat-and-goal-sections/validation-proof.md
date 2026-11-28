# Validation proof for T0306

## Failing tests before the implementation

Command: `npx vitest run tests/unit/store-tasks.test.js tests/unit/task-editor.test.js`
Exit code: 1

```
 FAIL  tests/unit/store-tasks.test.js > goal fields > takes the year unit as a recurrence rule
ValidationError: Not a valid recurrence-unit: year; it is day, week, or month.
 FAIL  tests/unit/store-tasks.test.js > goal fields > takes a decimal target from 0 for amount and reading goals, and only a whole number for checks and time
ValidationError: Not a valid target-count: 79.875; it is a whole number of at least 1.
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > focuses the Status tab once the task loaded, and has no Save button
 FAIL  tests/unit/task-editor.test.js > mountTaskEditor > status actions and lifecycle rules > goal > offers Check, At least, and At most, opens on Check, and hides measure, target, and unit then
 Test Files  2 failed (2)
      Tests  42 failed | 109 passed (151)
```

## Passing runs after the implementation

Command: `npx vitest run`
Exit code: 0

```
 Test Files  72 passed (72)
      Tests  2008 passed (2008)
```

Command: `npx eslint .`
Exit code: 0

```
(no output)
```

Command: `npx playwright test tests/e2e/task-editor.spec.js tests/e2e/behaviors.spec.js --reporter=list`
Exit code: 0

```
  ok  6 [chromium] › tests\e2e\task-editor.spec.js:98:3 › the editor splits into Status, Notes, Configuration, and History tabs ... at 390 px
  ok 18 [chromium] › tests\e2e\task-editor.spec.js:479:1 › a weekly at-most kcal goal with a start time saves as lifecycle rules and survives a reload
  ok 19 [chromium] › tests\e2e\task-editor.spec.js:526:1 › Cancel task cancels the task and Uncancel reopens it, from the Danger zone of Configuration
  21 passed (24.7s)
```

Command: `npx playwright test` (full suite, before fixing all-tasks, list, and sharing specs)
Exit code: 1; 21 failed, 278 passed. After fixing those specs, the three files showed 4 failures.
All remaining failures also fail on base commit a8a3668 (checked in a temporary worktree):
all-tasks 417 (two), all-tasks 853, backup 255, list 456, store-upgrade 52.

## Screenshots

Before: [Status light](before-status-light.png), [Status dark](before-status-dark.png), [Content light](before-content-light.png), [Content dark](before-content-dark.png)
After: [Status light](after-status-light.png), [Status dark](after-status-dark.png), [Configuration light](after-configuration-light.png), [Configuration dark](after-configuration-dark.png), [Danger zone light](after-configuration-bottom-light.png), [Danger zone dark](after-configuration-bottom-dark.png)
