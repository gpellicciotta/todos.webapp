Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/store/migrate.js
- src/js/store/tasks.js
- src/js/core/occurrences.js
- src/js/sync/queue.js
- src/js/sync/merge.js
- tests/unit/store-db.test.js
- tests/unit/store-tasks.test.js
- tests/unit/store-recurrence.test.js
- tests/unit/occurrences.test.js
- tests/unit/queue.test.js
- tests/unit/merge.test.js

### Tests
- Unit: the conversion matches the old fold, aborts on a mismatch, and counts dropped and differing events.
- Integration: an end-to-end test upgrades a seeded database with unticked tasks and shows the same counts.

Completion check: `npm test` and `npm run lint`
Size estimate: 11 files, 850 lines
Size note: converted events need the actions and queue handling that write and read them.
