Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/views/task-editor.js
- src/css/views.css
- tests/unit/task-editor.test.js
- tests/e2e/task-editor.spec.js
- tests/e2e/behaviors.spec.js

### Tests
- Unit: task-editor tests cover each field, its validation, and the hidden fields.
- Integration: an end-to-end test creates a weekly at-most kcal goal with a start time and reads it back.

Completion check: `npx vitest run tests/unit/task-editor.test.js` and `npx playwright test tests/e2e/task-editor.spec.js tests/e2e/behaviors.spec.js`
Size estimate: 5 files, 400 lines
