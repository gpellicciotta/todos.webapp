## Technical Specifications

### Declared Files
- src/js/views/all-tasks.js
- src/js/views/task-list.js
- src/js/views/view-controls.js
- src/js/views/add-bar.js
- tests/unit/view-controls.test.js
- tests/e2e/all-tasks.spec.js

Size estimate: 6 files, 550 lines
Size note: the screen and its shared row and control modules merge together.

### Tests
- Unit: filter and sort state round-trips through the per-device settings (`TV-12`).
- Integration: a first visit shows the empty state without any sign-in prompt.
- Integration: adding a task with Enter keeps focus in the add bar and shows the new row.
- Integration: the status menu changes a task's status by mouse and by keyboard.
- Integration: filters, search, and sort change the rows as specified, at 390 and 1440 px.

Completion check: `npm test && npm run lint && npm run test:e2e`
