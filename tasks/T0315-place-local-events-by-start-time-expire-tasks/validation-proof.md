# T0315 validation proof

## New tests against the old source (source diff reverted temporarily)
Command: `npx vitest run tests/unit/overdue.test.js tests/unit/store-recurrence.test.js tests/unit/query.test.js tests/unit/view-controls.test.js`

```text
 FAIL  tests/unit/overdue.test.js > expiry by goal (OVD-4) > fails an at-least task under fail, and expires once per occurrence when it is reopened
 FAIL  tests/unit/store-recurrence.test.js > start times place the first occurrence and the events > starts a one-off occurrence 1 at the start time, upcoming until then, and refuses events before it
 FAIL  tests/unit/query.test.js > failed and upcoming tasks (TV-3, TV-14, TV-15) > shows a task that starts within 24 hours, and hides one that starts later
 FAIL  tests/unit/view-controls.test.js > the Show upcoming option (TV-15) > is on by default and stores only the choice to hide upcoming tasks
 Tests  29 failed | 123 passed (152)
```

They failed for the right reasons: no start-time placement, `expire` gave `cancelled`, no `failed` status, no `showUpcoming`.
The implementation was written before this run; the run reverted `src/` afterwards.

## With the implementation
Command: `npm test`

```text
 Test Files  71 passed (71)
      Tests  1963 passed (1963)
```

Command: `npm run lint` printed only `eslint .` and no errors.
Command: `npm run check:sw`

```text
OK: 164 precached files match VERSION 2026-11-28.7.
```

## Not run
- `npm run test:e2e` (Playwright) was not run.
- The integration scenario is the unit test "shows an overdue fail task as failed through the failed filter, end to end" over the real store.
