Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/views/task-list.js
- src/js/views/view-controls.js
- src/js/core/query.js
- src/css/app-components.css
- tests/unit/task-list.test.js
- tests/unit/view-controls.test.js
- tests/e2e/list.spec.js

New files, not counted:
- src/js/views/quick-log.js
- tests/unit/quick-log.test.js

### Tests
- Unit: row marks per status and goal; the click per goal and status; quick log validation; Show upcoming and grouping.
- Integration: an end-to-end test logs from a row past an at-most limit, sees the mark, and undoes it from the toast.

Completion check: `npx vitest run tests/unit/task-list.test.js tests/unit/view-controls.test.js tests/unit/quick-log.test.js` and `npx playwright test tests/e2e/list.spec.js`
Size estimate: 7 files, 550 lines
Size note: the row marks and the quick log they open cannot merge apart.
