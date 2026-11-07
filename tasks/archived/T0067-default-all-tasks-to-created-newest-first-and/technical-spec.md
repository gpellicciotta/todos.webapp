### Declared Files
- src/js/core/query.js
- src/js/views/add-bar.js
- src/js/views/all-tasks.js
- src/js/views/list.js
- tests/unit/query.test.js
- tests/unit/view-controls.test.js
- tests/unit/add-bar.test.js
- tests/unit/all-tasks.test.js
- tests/unit/list.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/list.spec.js
- tests/e2e/lists.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- CHANGELOG.md

### Decisions
- **[Decided]** Only All tasks defaults to creation time descending; a list view keeps Manual order.
- **[Decided]** Add always opens the editor of the new task; the add field is not refocused.
- **[Decided]** `onAdd` resolves `false` to tell the add bar that focus moved to the editor.
- A stored order of an existing device is kept; only new devices and Reset use the new default.

### Tests
- Unit: `DEFAULT_ORDER` is creation time descending and `sortTasks` puts the newest task first.
- Unit: `defaultViewState`, the info line, and the View options panel read Created descending as the default.
- Unit: All tasks navigates to `#/tasks/{{task-id}}` and a list view to `#/lists/{{list-id}}/tasks/{{task-id}}` after Add; neither navigates when adding fails.
- Unit: the add bar skips its refocus when `onAdd` resolves `false`.
- Integration: end-to-end, Add opens the editor with focus on the description in All tasks and in a list view.
- Integration: end-to-end, the seeded tasks list newest first by default in All tasks, groups, and after Reset.

Completion check: `npm test` and `npx playwright test`
