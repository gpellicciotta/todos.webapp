## Walkthrough & Validation

### Key Changes
- `showFirstLaunch()` reads the session: while not local, it shows "Your tasks sync across your devices." and only Import a backup.
- The screen subscribes to the session and renders again on a change; `destroy()` unsubscribes.
- The First Launch flow in `ui-design.md` names the connected empty state.

### Red phase: unit tests
Command: `npx vitest run tests/unit/all-tasks.test.js` before the fix (exit 1)

```text
 FAIL  tests/unit/all-tasks.test.js > mountAllTasks > the empty state of a store without tasks > offers only Import a backup and names sync while connected
 FAIL  tests/unit/all-tasks.test.js > mountAllTasks > the empty state of a store without tasks > offers only Import a backup and names sync while sign-in-needed
AssertionError: expected 'Your tasks stay on this device.' to be 'Your tasks sync across your devices.' // Object.is equality
[... 12 lines omitted ...]
 FAIL  tests/unit/all-tasks.test.js > mountAllTasks > the empty state of a store without tasks > redraws when the session changes, without a store change, and stops listening once destroyed
AssertionError: expected 'Your tasks stay on this device.' to be 'Your tasks sync across your devices.' // Object.is equality
[... 12 lines omitted ...]
 Test Files  1 failed (1)
      Tests  3 failed | 34 passed (37)
```

### Red phase: e2e scenario
The e2e specs keep their service mocks per file, so the new case inlines its session and mock like `backup.spec.js`.

Command: `npx playwright test tests/e2e/all-tasks.spec.js -g "deleting every task"` before the fix (exit 1)

```text
    Call log:
      - Expect "toContainText" locator('[data-view="tasks"] .empty-state') with timeout 5000ms
      - waiting for locator('[data-view="tasks"] .empty-state')
        14 × locator resolved to <div class="empty-state">…</div>
           - unexpected value "No tasks yet.Your tasks stay on this device.Import a backupConnect to sync across devices"
[... 14 lines omitted ...]
  1 failed
    [chromium] › tests\e2e\all-tasks.spec.js:151:1 › connected, deleting every task shows an empty state without the Connect link
```

### Green phase
Command: `npx vitest run tests/unit/all-tasks.test.js` (exit 0)

```text
 Test Files  1 passed (1)
      Tests  37 passed (37)
```

Command: `npx vitest run` (exit 0)

```text
 Test Files  68 passed (68)
      Tests  1823 passed (1823)
```

Command: `npx eslint src/js/views/all-tasks.js tests/unit/all-tasks.test.js tests/e2e/all-tasks.spec.js` (exit 0, no output)

Command: `npx playwright test tests/e2e/all-tasks.spec.js` (exit 0)

```text
[... 33 lines omitted ...]
  ok 34 [chromium] › tests\e2e\all-tasks.spec.js:1008:1 › Finished today only shows open tasks and the tasks finished today, survives a reload, and Reset clears it (TV-14) (2.4s)

  34 passed (31.1s)
```

Command: `npx playwright test tests/e2e/connect.spec.js tests/e2e/sync.spec.js tests/e2e/backup.spec.js tests/e2e/sharing.spec.js tests/e2e/inbox.spec.js` (exit 0)

```text
[... 41 lines omitted ...]
  42 passed (40.3s)
```

### Visual check
Served by `node scripts/serve.mjs --port 8770` (HTTP 200), with a stored session and a mocked service returning no data.
The capture script reported no console errors, page errors, or HTTP errors in any capture.

- Before, wide: [empty-connected-before-wide.png](empty-connected-before-wide.png)
- Before, compact: [empty-connected-before-compact.png](empty-connected-before-compact.png)
- After, wide: [empty-connected-after-wide.png](empty-connected-after-wide.png)
- After, compact: [empty-connected-after-compact.png](empty-connected-after-compact.png)
- After, wide dark: [empty-connected-after-wide-dark.png](empty-connected-after-wide-dark.png)
