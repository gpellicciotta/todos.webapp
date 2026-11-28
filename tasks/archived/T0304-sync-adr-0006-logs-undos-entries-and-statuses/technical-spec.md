Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/core/occurrences.js
- src/js/sync/push.js
- src/js/sync/adopt.js
- src/js/sync/merge.js
- tests/unit/merge.test.js
- tests/unit/push.test.js
- tests/unit/pull.test.js
- tests/unit/adopt.test.js
- tests/unit/sync-fake-feed.js
- tests/contract/sync.contract.test.js
- docs/specs/local-store.md

### Tests
- Unit: queue, push, pull, and merge tests cover logs, undos, double undos, aliases, and unknown types.
- Integration: the contract tests log, undo, and read entries and progress back from a real server.

Completion check: `npx vitest run tests/unit/queue.test.js tests/unit/push.test.js tests/unit/pull.test.js` and `npm run test:contract`
Size estimate: 8 files, 400 lines
Size note: the goal-target wire fix touched adopt and the fake service; the real server failed 16 contract tests without it.

### Server for Contract Tests
- The loop manager builds the sibling todos.server checkout, T0301 included; do not build or edit it.
- From a worktree, set `TODOS_SERVER_DIR=../../../../todos.server`.
- 16 contract tests failed on main before this task; the whole contract suite must pass after it.
