Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/views/task-list.js
- src/js/views/task-editor.js
- src/js/views/task-history.js
- src/css/app-components.css
- tests/unit/task-list.test.js
- tests/unit/task-editor.test.js
- tests/e2e/list.spec.js

### Tests
- Unit: row marks for each status and goal; the log form validation; undo of an entry.
- Integration: an end-to-end test logs kcal entries past the limit, sees the mark, undoes one, and sees it clear.

Completion check: `npx vitest run tests/unit/task-list.test.js tests/unit/task-editor.test.js` and `npx playwright test tests/e2e/list.spec.js`
Size estimate: 7 files, 450 lines
Size note: the row marks, log form, and entries form one flow that cannot merge apart.
