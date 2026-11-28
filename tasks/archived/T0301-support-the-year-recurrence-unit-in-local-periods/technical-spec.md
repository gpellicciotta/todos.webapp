Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/core/periods.js
- tests/fixtures/recurrence-test-vectors.json
- tests/unit/periods.test.js

### Tests
- Unit: periods.test.js passes every shared vector, including the year cases.
- Integration test: none (the task editor offers the unit in T0306, whose end-to-end tests cover it)

Completion check: `npx vitest run tests/unit/periods.test.js`
Size estimate: 3 files, 100 lines
