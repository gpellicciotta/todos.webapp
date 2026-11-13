## Technical Specifications
Design: [todos.server T0215 design](../../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md), sections "Statuses", "Events and Status Rules", "Rule Edits", and "REST API".
Dependencies: T0224 (store and sync on the new task shape) and todos.server T0241 (Task shape and lifecycle-rules route).

- **[Decided]** The task row's status button ticks: `complete` when below target, `uncomplete` when the occurrence is completed.
  This changes `TSK-4`, since a click no longer opens the full status menu.
- **[Decided]** This task absorbs the one-click completion of todos.webapp T0225.
  T0225 stays in the backlog for now; the user can cancel it once this task lands.
- **[Decided]** A status menu on the row and in the editor offers `start`, `unstart`, `cancel`, and `reopen`.
  Each entry shows only when its precondition holds for the current occurrence.
- **[Decided]** Rows and the editor show `done/target` when the target is above 1.
- **[Decided]** The editor edits target count, deadline, and overdue handling through the lifecycle rules.
- **[Decided]** Filters, grouping, and sorting read status and due time from `current-occurrence`.
- **[Decided]** The "Last activity" sort becomes "Last update" on `last-update-time` (`LST-12`, `LV-6`, `TV-9`).
- **[Decided]** "Finished today only" (`TV-14`) uses the current occurrence's `close-time`.

### Declared Files
- `src/js/views/task-list.js`
- `src/js/views/task-editor.js`
- `src/js/views/view-controls.js`
- `src/js/views/all-tasks.js`
- `src/js/core/query.js`
- `tests/unit/task-list.test.js`
- `tests/unit/task-editor.test.js`
- `tests/unit/view-controls.test.js`
- `tests/unit/query.test.js`
- `tests/e2e/task-editor.spec.js`
- `tests/e2e/list.spec.js`
- `docs/requirements.md`
- `docs/specs/ui-design.md`
- `CHANGELOG.md`

### Tests
- Unit: `task-list.test.js` ticks a target-1 task to completed and back, and shows `2/3` on a target-3 task.
- Unit: `task-editor.test.js` shows only the event actions whose preconditions hold and saves target and deadline edits.
- Unit: `query.test.js` filters on the current occurrence status, sorts by `last-update-time`, and narrows Finished today by `close-time`.
- Integration: `task-editor.spec.js` ticks a target-3 task to `3/3` in local mode and edits its deadline.

Size estimate: 13 files, 900 lines
Size note: Above the typical line because the tick button, event menu, counts, and rule editing share the task row and editor code.
Completion check: `npm test && npm run test:contract && npm run test:e2e`
