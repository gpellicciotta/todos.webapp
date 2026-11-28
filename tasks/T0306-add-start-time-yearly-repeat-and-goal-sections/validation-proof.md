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
