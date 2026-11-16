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

Size estimate: 8 files, 380 lines.

### Design Source
- The Task Row section of T0257's brief governs; revise this spec if sign-off changed it.
- The row redesign discussed in T0257 may move the chip; follow the signed-off row layout.
- Brief: ../T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md.

### Chip Button
- Above target 1, the counts render as a button beside the open link, such as "2/3", also on compact layouts.
- Its name reads "Change count, 2 of 3 done"; it has `aria-haspopup="dialog"` and `aria-expanded`.
- Viewers and closed recurring series show the counts as plain text.

### Popover
- It opens below the chip with the vendored `attachPopover`.
- Escape or an outside click closes it, and focus returns to the chip.
- It holds the count stepper of count-stepper.js: minus, "2 of 3", plus, with T0258's rules.
- Focus starts on plus; Tab moves between minus and plus.
- While cancelled, both buttons are disabled, with the hint "Reopen the task to change its count."
- A store change re-renders the row and keeps the popover open on the same task, like the row menus.
- Changes show no toast; the popover itself is the undo.

### Tests
- Unit: the chip is a button above target 1 and outside the open link; viewers get plain text.
- Unit: plus and minus post complete and uncomplete; minus from 1 posts uncomplete then start.
- Unit: the popover stays open across a re-render and returns focus to the chip on Escape.
- Integration: the All tasks e2e spec ticks a target 3 task to 2 of 3, then lowers it to 1 in the popover.
- Integration: the gallery e2e spec shows the chip button and the open popover specimen.

Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/gallery-app.spec.js` pass.
