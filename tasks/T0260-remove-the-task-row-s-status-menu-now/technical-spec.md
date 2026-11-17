## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- tests/unit/task-list.test.js
- tests/unit/all-tasks.test.js
- tests/e2e/list.spec.js
- tests/e2e/gallery-app.spec.js
- src/css/app-components.css
- src/demo/visual-style-gallery.html
- docs/specs/visual-style-guide.md
- docs/specs/ui-design.md
- docs/requirements.md
- tests/e2e/all-tasks.spec.js (added during execution: two of its tests drove the status menu)
- tests/unit/recurrence-review.test.js (added during execution: it imported `statusActions`)
- docs/specs/local-store.md (added during execution: its display rule named the status menu)

Size estimate: 10 files, 380 lines, mostly deletions.
Measured: 13 files, 580 lines (162 added, 418 deleted).
Size note: removing one component crosses JS, CSS, gallery, docs, and tests; no split piece merges alone.

### Removal
- Remove `statusActions`, the status menu element, and its open logic from task-list.js.
- Keep `STATUS_ACTIONS` exported only if the task editor of T0258 still imports it; otherwise remove it.
- Remove the long press timer, its slop, and the touch callout rule, if nothing else needs them.
- The status button tooltip drops "Right-click or press Down for more actions."
- Down and Up on a status button do nothing special; the row keys keep working.
- TSK-4 and the grace period requirement name the task editor, not the row's status menu.

### Tests
- Unit: right-click, long press, Down, Shift+F10, and the Menu key open no menu on the status button.
- Unit: the status button tooltip names the status and counts only.
- Integration: the list e2e spec cancels a task from the task editor instead of the status menu.
- Integration: the gallery e2e spec passes without the status menu specimen.

Completion check: `npm test` and `npx playwright test tests/e2e/list.spec.js tests/e2e/gallery-app.spec.js` pass.
