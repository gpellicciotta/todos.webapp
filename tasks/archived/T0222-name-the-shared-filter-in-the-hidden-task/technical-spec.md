## Technical Specifications

### Declared Files
- src/js/core/query.js
- src/js/views/add-bar.js
- src/js/views/all-tasks.js
- src/js/views/list.js
- tests/unit/query.test.js
- tests/unit/add-bar.test.js

### Tests
- Unit: `hidingFilters` reports `shared` for a task outside shared lists under Shared: yes.
- Unit: the toast reads "Task added. Shared: yes hides it." and Show clears only `shared`.
- Integration: connected e2e adds a task under Shared: yes, sees the toast, and Show reveals the task.

Completion check: `npm test` and the connected sharing e2e spec pass.
Size estimate: 6 files, 80 lines.
