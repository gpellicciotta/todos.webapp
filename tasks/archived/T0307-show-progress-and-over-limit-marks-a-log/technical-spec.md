Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/views/task-editor.js
- src/js/views/task-history.js
- src/js/core/occurrences.js
- src/css/app-components.css
- src/css/views.css
- tests/unit/task-editor.test.js
- tests/e2e/task-editor.spec.js

New files, not counted:
- src/js/core/progress.js
- tests/unit/progress.test.js

### Tests
- Unit: pace and approaching per goal; Status tab actions per status; Log form validation; undo of an entry.
- Integration: an end-to-end test logs kcal entries past the limit, sees the orange box, undoes one, and sees it clear.

Completion check: `npx vitest run tests/unit/progress.test.js tests/unit/task-editor.test.js` and `npx playwright test tests/e2e/task-editor.spec.js`
Size estimate: 7 files, 550 lines
Size note: the Status tab, its Log form, and its entries form one flow that cannot merge apart.
