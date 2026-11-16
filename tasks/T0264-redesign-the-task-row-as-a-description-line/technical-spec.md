## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- src/css/app-components.css
- tests/unit/task-list.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/gallery-app.spec.js
- src/demo/visual-style-gallery.html
- docs/specs/visual-style-guide.md
- docs/specs/ui-design.md

Size estimate: 8 files, 400 lines.

### Design Source
- The Task Row Layout section of T0257's brief governs; revise this spec if sign-off changed it.
- Brief: ../T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md.
- Mock-up: variant C of the card canvas named in the brief.

### Description Line
- The status button, then the description, clamped to 2 lines on every width.
- The row grows to fit; rows keep at least the 44 px touch target.

### Meta Line
- Small muted text under the description, aligned with its start, shown only when it has content.
- Above target 1: the counts first, such as "2 of 3 done", in the status color.
- Then a clock icon and the relative due text, such as "Tomorrow 18:00", or a repeat icon and the interval, such as "Daily".
- Then the lists: plain text joined by " · " below 48rem; small pills from 48rem.
- The list view leaves out its own list, as today; text that does not fit ends in an ellipsis.

### Overdue
- An overdue row's due text and clock use `--color-danger`, at regular weight with 4.5:1 contrast in both themes.
- The text stays, so overdue never relies on color alone (`OVD-2`).
- The "Overdue" chip goes.

### Removed
- The note count and the people icon leave the row; the lists overview keeps its shared marks.

### Virtual Rows
- Rows now differ in height; the long-list rendering must still keep focus, menus, and drags, as long-list.spec.js checks.

### Tests
- Unit: the meta line holds the counts, due or repeat, and lists in that order, and hides when empty.
- Unit: overdue rows mark their due text for the danger color; in-time rows do not.
- Unit: rows render no note count, no people icon, and no Overdue chip.
- Integration: the All tasks e2e spec finds a 2 line description and the meta line at 360 and 1440 px.
- Integration: the gallery e2e spec shows the new row specimens.

Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/gallery-app.spec.js tests/e2e/long-list.spec.js` pass.
