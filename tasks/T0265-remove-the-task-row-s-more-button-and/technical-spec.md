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
- Found during execution: src/css/views.css (list view rule that kept More on compact rows).
- Found during execution: src/js/views/list.js (the `moves.step` only the menu called).
- Found during execution: src/demo/visual-style-gallery.html and tests/e2e/gallery-app.spec.js (row specimens).
- Found during execution: docs/specs/visual-style-guide.md (Task row component and Manual ordering pattern).
- Found during execution: tests/e2e/sharing.spec.js and tests/unit/reorder.test.js (More and menu-entry wording).
- Found during execution: src/service-worker.js (VERSION bump the precache check requires).

Size estimate: 8 files, 350 lines, mostly deletions.
Size note: measured 16 files and 665 lines, mostly deletions; each extra file drops a More reference, so a split piece could not merge alone.
Mechanical command: `node scripts/check-sw-version.mjs --update`.
Mechanical files: scripts/sw-precache-hashes.json

### Design Source
- The Task Row Layout and Task Reordering sections of T0257's brief govern; revise this spec if sign-off changed it.
- Brief: ../T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md.

### Removal
- Remove the More button, the row menu, and its Add to list, Remove from this list, Move up, Move down, and Delete entries.
- Remove the Delete Undo toast path only if the editor's delete does not reuse it.
- Rows keep no trailing control; the meta line or description takes the room.
- TSK-8, TSK-11, and LV-3 name the editor and the move keys instead of the row menu.
- Relax the design principle in ui-design.md: every drag keeps a keyboard alternative, with no visible button required.
- The Accessibility section names the Alt keys, not Move up and Move down, as the tasks' drag alternative.

### Tests
- Unit: rows render no More button, and no key opens a row menu.
- Integration: the All tasks e2e spec deletes a task from the editor and undoes it with Ctrl+Z.
- Integration: the list e2e spec removes a task from the list in the Lists section of the editor's Status tab.

Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js` pass.
