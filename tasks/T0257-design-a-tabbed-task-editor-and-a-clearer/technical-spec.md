## Technical Specifications

### Declared Files
- docs/specs/ui-design.md
- docs/requirements.md
- scripts/draw-wireframes.py
- Regenerated, not counted: docs/img/ui/task-editor*.svg from scripts/draw-wireframes.py.

Mechanical command: `python scripts/draw-wireframes.py`.
Size estimate: 3 files, 300 lines.

### Current Editor
- One long column: Description, Status, Target count, Due, Overdue behavior, Repeat, Lists, Notes, History, Details, Delete.
- See the Task Editor section of docs/specs/ui-design.md and src/js/views/task-editor.js.

### Requested Tabs
- a) Description, Lists, and Notes.
- b) Status, Target count, Due, Overdue behavior, and Repeat.
- c) History.
- Open questions: where Details and Delete task go; which tab opens first; whether the tab persists per device.
- Constraints: tabs follow the WAI-ARIA tabs pattern; Escape still closes the editor; the phone sheet keeps working.

### Status Problem
- A click on the status button ticks: `complete` below target, `uncomplete` once completed (see `tickEvent` in task-list.js).
- So at target 3, ticks go 0 to 1 to 2 to 3, and only 3 of 3 unticks; a tick at 2 of 3 cannot be taken back.
- The service has `uncomplete` (todos.server business logic spec); check whether it accepts it below target.
- The user reports 2 of 3 shown as completed; `statusFromCount` says in progress, so check the row and editor icons.

### Options to Brainstorm
- A count stepper (minus, count, plus) beside the status, with the tick as the plus.
- A segmented status control (To do, In progress, Done, Cancelled) plus a separate count stepper.
- Keep one tick button, and add Untick to the status menu and the editor whenever the count is above 0.

### Sign-Off
- The user approves the wireframes and the design text through `plan tasks review --approve`.
- Implementation tasks are filed only after approval, split along the size lines.

### Tests
- Unit test: none (design and documentation only).
- Integration test: none (design and documentation only); the wireframe script's own tests still pass.

Completion check: the user's sign-off, and `python -m pytest tests/test_draw_wireframes.py` passes.
