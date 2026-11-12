## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- src/js/views/settings.js
- tests/unit/task-list.test.js
- tests/unit/settings.test.js
- tests/e2e/list.spec.js
- tests/e2e/all-tasks.spec.js
- docs/requirements.md
- docs/specs/ui-design.md

### Requirements
- Toggle mapping: `todo` and `in-progress` go to `completed`; `completed` and `cancelled` go to `todo`.
- The status button's accessible name states the action, such as "Mark Buy paint completed".
- The full status menu keeps its current keyboard behavior once opened.
- Opening the menu needs a visible alternative to long press, per the keyboard and touch parity principle.
  The task editor's status control counts as that alternative if the Decide step drops the chevron.
- `x` works on the focused row only, never while a text field has focus.
- A viewer keeps a disabled status button; roles follow `SHR-4`.
- The Undo toast appears only when the change hides the row under the active filters.
- Ctrl+Z runs that Undo, like every other Undo toast.
- Add the `x` row to `SHORTCUTS` in settings.js.

### Tests
- Unit: a click on each of the four statuses produces the mapped status.
- Unit: the menu path still sets `in-progress` and `cancelled`.
- Unit: `x` toggles the focused row and does nothing inside a text field.
- Unit: a viewer cannot toggle.
- Integration: e2e completes a task in a list by one click, sees the Undo toast, undoes it, then cancels a task through the menu.

Completion check: `npm run test:unit` and the list and all-tasks e2e specs pass.
