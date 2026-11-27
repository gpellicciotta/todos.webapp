Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/core/occurrences.js
- tests/unit/occurrences.test.js

New files, not counted:
- tests/fixtures/fold-test-vectors.json
- tests/unit/fold-vectors.test.js

### Tests
- Unit: every shared fold vector passes; focused cases cover undo sets, carried readings, and legacy events.
- Integration test: none (pure fold logic; T0303 and T0304 test it through the store and sync)

Completion check: `npx vitest run tests/unit/fold-vectors.test.js tests/unit/occurrences.test.js`
Size estimate: 2 files, 450 lines
Size note: the fold is one module whose parts cannot merge apart.
