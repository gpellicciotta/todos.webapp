## Walkthrough & Validation

Red phase: `npx vitest run tests/unit/adopt.test.js tests/unit/bin.test.js` exited 1 with 4 failed, 53 passed (new adoption and restore-membership tests).

Green phase: `npm test`, exit code 0.

```text
 Test Files  60 passed (60)
      Tests  1579 passed (1579)
```

Undeclared files touched: `src/js/sync/queue.js` (restore queues memberships), `tests/unit/queue.test.js` (expects the added membership entry).
