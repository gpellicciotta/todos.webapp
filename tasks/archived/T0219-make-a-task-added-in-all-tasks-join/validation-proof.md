## Walkthrough & Validation

### Key Changes
- `add()` in `src/js/views/all-tasks.js` stores the new task with `{ lists: [] }` and passes `listIds: []` to `notifyIfHidden`.
- `ui-design.md` and `CHANGELOG.md` describe the new rule; the service worker `VERSION` moved to `2026-11-10.5`.

### Red Phase
Command: `npx vitest run tests/unit/all-tasks.test.js` (exit 1)
```text
 ❯ tests/unit/all-tasks.test.js (25 tests | 1 failed) 1447ms
     × adds the task to no list while the Lists filter selects lists, and toasts that the filter hides it 1019ms
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times
      Tests  1 failed | 24 passed (25)
```

Command: `E2E_PORT=8819 npx playwright test tests/e2e/all-tasks.spec.js -g "joins no list"` (exit 1)
```text
      - Expect "toContainText" locator('.toast').filter({ hasText: 'Task added.' }) with timeout 5000ms
    > 528 |   await expect(toast).toContainText('Lists: 2 lists hides it.');
  1 failed
    [chromium] › tests\e2e\all-tasks.spec.js:515:1 › a task added while the Lists filter selects lists joins no list, and Show reveals it
```

### Green Phase
Command: `npx vitest run` (exit 0)
```text
 Test Files  59 passed (59)
      Tests  1233 passed (1233)
```

Command: `E2E_PORT=8819 npx playwright test` (exit 0)
```text
  ok  19 [chromium] › tests\e2e\all-tasks.spec.js:494:1 › adding a task that the view options hide shows a toast whose Show resets those options (VO-3) (2.3s)
  ok  20 [chromium] › tests\e2e\all-tasks.spec.js:515:1 › a task added while the Lists filter selects lists joins no list, and Show reveals it (2.4s)
  196 passed (2.2m)
```

Commands: `npm run lint` and `npm run check:sw` (exit 0)
```text
> eslint .
OK: 75 precached files match VERSION 2026-11-10.5.
```

An earlier full unit run had one timing failure in `tests/unit/serve.test.js`; it passed three times alone and in the full rerun above.
