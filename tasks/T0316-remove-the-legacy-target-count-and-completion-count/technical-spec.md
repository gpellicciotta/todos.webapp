Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- src/js/store/migrate.js
- src/js/store/tasks.js
- src/js/core/occurrences.js
- src/js/sync/queue.js
- src/js/sync/merge.js
- src/js/views/task-list.js
- src/js/views/task-editor.js
- tests/unit/occurrences.test.js
- tests/unit/task-editor.test.js
- tests/unit/task-list.test.js
- tests/unit/task-shape.js

### Tests
- Unit: the existing tests pass on records without the legacy fields.
- Integration: the existing end-to-end tests pass unchanged in behavior.

Completion check: `python scripts/devops.py check`
Size estimate: 11 files, 500 lines
Size note: the fields leave every reader at once, or the app breaks.
