## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- tests/unit/task-list.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/list.spec.js
- docs/specs/ui-design.md
- docs/requirements.md

Size estimate: 6 files, 260 lines.

### Design Source
- The Task Row section of T0257's brief governs; revise this spec if sign-off changed it.
- Brief: ../T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md.

### Click Rules
- `tickEvent` returns `complete` or null; it never returns `uncomplete` or `reopen`.
- Target 1: `complete` while Ready or In progress; null while Completed or Cancelled.
- Above target 1: `complete` unless Cancelled; past the target the count overshoots, such as 4 of 3.
- A closed recurring series returns null.
- A null tick posts nothing; `x` follows the same rule.

### Inert States
- A row whose tick is null marks its status button `aria-disabled="true"`, keeping it focusable for the row keys.
- Its tooltip reads "Open the task to change its status." and its name drops the Tick or Untick verb.
- Viewers keep today's disabled button (`SHR-4`).

### Undo Toast
- Every posted tick shows a toast, also when the row stays visible.
- Status changes keep "Task marked completed."; a count change alone reads "Ticked, 2 of 3 done."
- Undo, and Ctrl+Z, post `uncomplete`, today's inverse.

### Tests
- Unit: tickEvent returns complete or null for each status at targets 1 and 3, and for closed series.
- Unit: an inert row posts nothing on click or `x`, and its button has aria-disabled and the tooltip.
- Unit: every tick shows the Undo toast with the right message; Undo posts uncomplete.
- Integration: the All tasks e2e spec ticks a target 3 task to 4 of 3, undoes once, and finds 3 of 3.
- Integration: the list e2e spec finds a completed target 1 row inert to a click.

Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js` pass.
