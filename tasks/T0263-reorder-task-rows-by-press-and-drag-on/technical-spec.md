## Technical Specifications

### Declared Files
- src/js/views/reorder.js
- src/js/views/task-list.js
- src/css/app-components.css
- tests/unit/reorder.test.js
- tests/unit/task-list.test.js
- tests/e2e/list.spec.js
- docs/specs/ui-design.md
- docs/requirements.md

Size estimate: 8 files, 400 lines.

### Design Source
- The Task Reordering section of T0257's brief governs; revise this spec if sign-off changed it.
- Brief: ../T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md.
- Settle the brief's open points first: the key pair for the ends, and the visible move alternative.

### Pointer Drag
- A primary-button press on the row, outside its buttons, starts a drag once the pointer moves 6 px.
- A press released before that threshold stays a click and opens the editor, as today.
- The open link must not start the browser's native link drag.
- Drags keep today's edge auto-scroll, drop indicator, Escape cancel, and announcement.

### Outside Handle
- On pointer devices, the focused or hovered row shows a grip handle in the gutter before the row, outside its box.
- The handle is a drag start too; it is hidden while sorted, grouped, or searching.
- Rows no longer reserve room for a handle.

### Long Hold
- On touch, a hold of 400 ms that moves less than 10 px starts the drag, with a short vibration where supported.
- A move past 10 px before then lets the page scroll and cancels the hold.
- T0260 has removed the long-press status menu, so the hold has no other meaning.

### Keys
- Alt+Up and Alt+Down move the focused row one place, as today.
- Alt+Home and Alt+End move it to the top or bottom of the list.
- reorder.js serves both the task list and the Lists screen; give it an optional `jump(id, end)` callback.
- Alt+Home and Alt+End call it when given; the task list passes one here.
- Whichever of this task and T0076 lands first adds the callback; the other reuses it.
- Focus stays on the moved row; the live region announces its new place.

### Tests
- Unit: a press moving under 6 px opens the editor; past 6 px it drags and opens nothing.
- Unit: a 400 ms touch hold starts a drag; an earlier 10 px move cancels it.
- Unit: Alt+Home and Alt+End move the focused row to the ends and keep focus on it.
- Unit: the outside handle shows only on the focused or hovered row under manual order.
- Integration: the list e2e spec drags a row by press-and-drag at 1440 px and reloads to find the order kept.
- Integration: the list e2e spec moves a row with Alt+End and Alt+Home.

Completion check: `npm test` and `npx playwright test tests/e2e/list.spec.js` pass.
