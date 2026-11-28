Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/store/db.js
- src/js/store/migrate.js
- src/js/store/tasks.js
- src/js/core/overdue.js
- src/js/core/query.js
- tests/unit/store-db.test.js
- tests/unit/store-tasks.test.js
- tests/unit/store-recurrence.test.js

### Tests
- Unit: store tests cover the upgrade, the conversion report, log and undo, expiry per goal, and start times.
- Integration: an end-to-end test upgrades a seeded older database and shows tasks with their counts kept.

Completion check: `npx vitest run tests/unit/store-db.test.js tests/unit/store-tasks.test.js tests/unit/store-recurrence.test.js`
Size estimate: 8 files, 450 lines
Size note: the store schema, its upgrade, and the actions that use it cannot merge apart.
