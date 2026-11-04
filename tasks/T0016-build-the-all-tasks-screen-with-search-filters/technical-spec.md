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

### Follow-Ups From Earlier Reviews
- From T0009: read-only rows must not hover the disabled status button; selected rows need pressed feedback.
- From T0009: use a logical inset for the selected-row edge, and replace unitless token math with tokens.
- From T0009: the task list pattern shows completed rows under a "Status: open" filter; fix the specimen.
- From T0032: catch subscriber errors after commit, and test that every write operation notifies.
- From T0033: Ctrl or Cmd+Z must only run Undo actions, never a Reload, and not while a modal is open.
- From T0015: show the version-change Reload as a persistent banner, and run purge before starting the overdue timer.
- From T0015: catch start-up failures, and move focus to main or announce the route on navigation.
- From T0015: make the `theme-color` meta follow the stored theme preference.
