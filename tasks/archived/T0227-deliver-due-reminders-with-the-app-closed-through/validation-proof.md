## Walkthrough & Validation

### Red: new tests fail before implementation
Command: `npx vitest run tests/unit/push-subscription.test.js tests/unit/service-worker-notification.test.js tests/unit/api.test.js tests/unit/session.test.js tests/unit/settings.test.js` (exit code 1)

```text
 FAIL  tests/unit/settings.test.js > Reminders with the app closed in Settings > says nothing while push is off
TypeError: Cannot read properties of null (reading 'hidden')
 Test Files  5 failed (5)
      Tests  10 failed | 78 passed (88)
```

### Green: unit tests, lint, service worker version
Commands: `npm test`, `npm run lint`, `npm run check:sw` (all exit code 0)

```text
 Test Files  72 passed (72)
      Tests  1986 passed (1986)
> eslint .
OK: 165 precached files match VERSION 2026-11-28.9.
```

### Green: reminders e2e, with the service worker, PWA, and settings sync specs
Command: `npx playwright test tests/e2e/reminders.spec.js tests/e2e/service-worker.spec.js tests/e2e/pwa.spec.js tests/e2e/settings-sync.spec.js` (exit code 0)

```text
  11 passed (15.8s)
```
The pushed-reminder test delivers the service's example payload to the real worker as a push event and records the worker's `showNotification`.
Headless Chromium denies notifications inside the worker, so a real notification is left to todos.server T0308 and T0317.

### Contract: the new push test passes; 16 older tests fail the same way on main
Command: `TODOS_SERVER_DIR=../../../../todos.server npm run test:contract` (exit code 1)

```text
      Tests  16 failed | 7 passed (23)
AssertionError: expected [ 2, +0, +0 ] to deeply equal [ 2, 3, 3 ]
```
Baseline on the main checkout at 3c0ae4f, before this task's test existed: `Tests  16 failed | 6 passed (22)`.
The new test "registers a push subscription, reads it back, changes its lead time, and deletes it" is among the 7 passed.
The 16 failures are older task, note, and recycle-bin sync tests; the built todos.server jar probably predates the ADR-0006 task model. I did not build or edit todos.server.

### Full e2e: the same 8 failures as on main
Command: `npm run test:e2e` (exit code 1)

```text
  8 failed
  289 passed (4.9m)
```
Failing: all-tasks (3), backup (1), list (1), store-upgrade (1), task-editor (2).
Baseline on the main checkout at 3c0ae4f for those five specs: `8 failed`, `74 passed`.

### Visual: desktop Chromium, Settings Reminders, connected session with a stubbed push
- Before (local mode, reminders on, no push line): [before-light-local.png](before-light-local.png)
- After, push on, light: [after-light-on.png](after-light-on.png)
- After, push on, dark: [after-dark-on.png](after-dark-on.png)
- After, service without push keys (503), dark: [after-dark-unavailable.png](after-dark-unavailable.png)
