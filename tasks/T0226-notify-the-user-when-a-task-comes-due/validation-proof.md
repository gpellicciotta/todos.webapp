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
