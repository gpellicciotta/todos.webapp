Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/core/backup.js
- tests/unit/backup.test.js
- tests/e2e/backup.spec.js

### Tests
- Unit: format 3 round-trips; format 1 and 2 files convert as specified.
- Integration: the backup end-to-end test exports a goal task with entries and imports it into an empty store.

Completion check: `npx vitest run tests/unit/backup.test.js` and `npx playwright test tests/e2e/backup.spec.js`
Size estimate: 3 files, 250 lines
