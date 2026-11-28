Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/store/db.js
- src/js/store/migrate.js
- src/js/store/tasks.js
- src/js/core/occurrences.js
- tests/unit/store-db.test.js
- tests/unit/store-tasks.test.js
- tests/unit/occurrences.test.js
- tests/unit/task-shape.js

### Tests
- Unit: a version 5 database upgrades with the new fields filled and the mirrors equal to them.
- Integration: an end-to-end test opens a seeded version 5 database and shows tasks with their counts kept.

Completion check: `npm test` and `npm run lint`
Size estimate: 8 files, 600 lines
Size note: the record fields, their upgrade, and the mirrors cannot merge apart.
