## Walkthrough & Validation

### Red phase (before implementation)
Command: `npx vitest run tests/unit/reminders.test.js tests/unit/settings.test.js tests/unit/service-worker-notification.test.js`, exit code 1.

```text
 ❯ tests/unit/service-worker-notification.test.js (3 tests | 3 failed)
 ❯ tests/unit/settings.test.js (44 tests | 6 failed)
 FAIL  tests/unit/reminders.test.js [ tests/unit/reminders.test.js ]
Error: Cannot find module '../../src/js/core/reminders.js'
TypeError: handlers.notificationclick is not a function
TypeError: Cannot read properties of null (reading 'checked')
```

### Green phase
Command: `npm test`, exit code 0.

```text
 Test Files  62 passed (62)
      Tests  1617 passed (1617)
```

Command: `npx playwright test tests/e2e/reminders.spec.js tests/e2e/service-worker.spec.js tests/e2e/bin-settings.spec.js`, exit code 0.

```text
  16 passed (15.5s)
```

Command: `npx playwright test` (full e2e), exit code 1.

```text
  1) [chromium] › tests\e2e\behaviors.spec.js:109:3 › popover behavior › keyboard alone opens the filter popover, sets a filter, and closes it
    Error: expect(locator).toBeFocused() failed
  1 failed
  227 passed (2.4m)
```

That failure also occurs on the unchanged base (stashed my work and reran `behaviors.spec.js`: 1 failed, 4 passed). It is unrelated to reminders.

Commands `npx eslint .` and `npm run check:sw` exit 0 (`OK: 130 precached files match VERSION 2026-11-17.14.`).

### Visual
[light](after-settings-reminders-light.png), [dark](after-settings-reminders-dark.png): Chromium, Settings Reminders section with the switch on.
Not done: Firefox, and a real operating system notification. The unattended run has no desktop to observe them; the e2e mocks `showNotification`.

### Review round 1 rework
Fixes: the ledger no longer caps at 500 tags (the scheduler prunes tags of tasks that left the store or changed due time), and a tag is recorded only after its notification succeeded. A failed notification retries at the next check, and the timer re-arms after every check.

Command: `npx vitest run tests/unit/reminders.test.js`, exit code 0.

```text
 Test Files  1 passed (1)
      Tests  25 passed (25)
```

Command: `npm test`, exit code 0.

```text
 Test Files  62 passed (62)
      Tests  1623 passed (1623)
```

Command: `npx playwright test tests/e2e/reminders.spec.js tests/e2e/service-worker.spec.js tests/e2e/bin-settings.spec.js`, exit code 0.

```text
[... 4 lines of Node warnings omitted ...]
  16 passed (15.2s)
```

Command: `npx eslint .` exit code 0, no output. Command: `npm run check:sw` exit code 0.

```text
OK: 130 precached files match VERSION 2026-11-17.15.
```
