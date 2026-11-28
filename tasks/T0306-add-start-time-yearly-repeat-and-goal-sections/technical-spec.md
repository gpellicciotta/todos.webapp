Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/views/task-editor.js
- src/js/views/editor-panel.js
- src/css/views.css
- tests/unit/task-editor.test.js
- tests/e2e/task-editor.spec.js
- tests/e2e/behaviors.spec.js

### Tests
- Unit: the four tabs and their parts, the Goal, Recurrence, and Time window fields, their validation, and hidden fields.
- Integration: an end-to-end test creates a weekly at-most kcal goal with a start time and reads it back.

Completion check: `npx vitest run tests/unit/task-editor.test.js` and `npx playwright test tests/e2e/task-editor.spec.js tests/e2e/behaviors.spec.js`
Size estimate: 6 files, 500 lines
Size note: the tab rebuild and the fields that move onto it cannot merge apart.
