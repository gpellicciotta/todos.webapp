Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/store/tasks.js
- src/js/core/occurrences.js
- src/js/core/overdue.js
- src/js/core/query.js
- src/js/core/preferences.js
- tests/unit/overdue.test.js
- tests/unit/query.test.js
- tests/unit/store-recurrence.test.js
- tests/unit/preferences.test.js

### Tests
- Unit: expiry per goal and direction, start-time placement, the failed filter, and the upcoming flag.
- Integration: an end-to-end test lets an overdue Fail task expire and shows it as failed.

Completion check: `npm test` and `npm run lint`
Size estimate: 9 files, 600 lines
Size note: the window rules and the filters over their results cannot merge apart.
