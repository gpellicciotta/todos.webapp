## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- src/css/app-components.css
- tests/unit/task-list.test.js
- tests/unit/all-tasks.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/list.spec.js
- docs/specs/ui-design.md
- docs/requirements.md

Size estimate: 8 files, 350 lines, mostly deletions.

### Design Source
- The Task Row Layout and Task Reordering sections of T0257's brief govern; revise this spec if sign-off changed it.
- Brief: ../T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md.

### Removal
- Remove the More button, the row menu, and its Add to list, Remove from this list, Move up, Move down, and Delete entries.
- Remove the Delete Undo toast path only if the editor's delete does not reuse it.
- Rows keep no trailing control; the meta line or description takes the room.
- TSK-8, TSK-11, and LV-3 name the editor and the move keys instead of the row menu.

### Tests
- Unit: rows render no More button, and no key opens a row menu.
- Integration: the All tasks e2e spec deletes a task from the editor and undoes it with Ctrl+Z.
- Integration: the list e2e spec removes a task from the list in the editor's Lists section.

Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js` pass.
