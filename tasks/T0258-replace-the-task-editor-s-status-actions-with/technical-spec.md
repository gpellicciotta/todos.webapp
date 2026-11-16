## Technical Specifications

### Declared Files
- src/js/views/task-editor.js
- src/css/app-components.css
- tests/unit/task-editor.test.js
- tests/e2e/task-editor.spec.js
- docs/specs/ui-design.md
- docs/requirements.md
- docs/specs/visual-style-guide.md
- src/demo/visual-style-gallery.html
- New, not counted: src/js/views/count-stepper.js and tests/unit/count-stepper.test.js.

Size estimate: 8 files, 400 lines.

### Design Source
- The Task Editor Status section of T0257's brief governs; revise this spec if sign-off changed it.
- Brief: ../T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md.

### State Buttons
- Replace the tick button and the Start, Undo start, Cancel task, and Reopen buttons of `fillStatus`.
- Four icon buttons in a labeled group: Ready, In progress, Completed, Cancelled, using the status sprite icons.
- The current status is pressed (`aria-pressed="true"`); each button's name is its status label, also as tooltip.
- A click posts the events of `eventsTowardsStatus(occurrence, status, rules)`, in order.
- Above target 1, Completed is disabled while the count is below target; its tooltip reads "Reach 3 of 3 to complete".
- Above target 1, In progress is disabled while the count is at or above target.
- A closed recurring series enables only Ready, which posts `reopen`.
- The status text line stays, such as "In progress, 2 of 3 done".

### Stepper
- Shows above target 1 while the status is not Ready: minus, "2 of 3", plus.
- Plus posts `complete`, also past the target; minus posts `uncomplete` and is disabled at 0.
- Minus from 1 posts `uncomplete` then `start`, so the task stays In progress at 0.
- While cancelled, both buttons are disabled; the count stays visible.
- The count is a polite live region, so screen readers hear each change.
- Build it in src/js/views/count-stepper.js, so the row popover of T0261 reuses it.

### Previous Period
- While `graceOccurrence(task, now)` names an occurrence, show a Complete for previous period button.
- It posts `complete` with that occurrence, as the row status menu does today.

### Focus
- A focused control that becomes disabled or hidden passes focus to the pressed state button.

### Tests
- Unit: each state button posts the events of eventsTowardsStatus; Ready from 2 of 3 posts two uncompletes.
- Unit: above target 1, Completed and In progress disable by count, with their tooltips.
- Unit: the stepper hides at Ready, disables while cancelled, disables minus at 0, and keeps In progress from 1.
- Unit: a closed recurring series enables only Ready; a viewer sees every control disabled.
- Unit: Complete for previous period shows only during the grace period and names that occurrence.
- Integration: the task editor e2e spec steps a target 3 task to 2, back to 1, then Ready resets it to 0.

Completion check: `npm test` and `npx playwright test tests/e2e/task-editor.spec.js` pass.
