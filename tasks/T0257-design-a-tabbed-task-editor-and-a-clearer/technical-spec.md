## Technical Specifications

### Declared Files
- docs/specs/ui-design.md
- docs/requirements.md
- scripts/draw-wireframes.py
- Regenerated, not counted: docs/img/ui/task-editor*.svg and the row wireframes from scripts/draw-wireframes.py.

Mechanical command: `python scripts/draw-wireframes.py`.
Size estimate: 3 files, 400 lines.

### Findings
- The todos.server business logic spec accepts `uncomplete` whenever the count is above 0, at any target.
- It accepts `complete` whenever the status is not `cancelled`, so a count may pass its target.
- `applyEvent` in src/js/core/occurrences.js follows the same rules, so the design needs no server change.
- Today the row ticks up and unticks only once completed; untick at 3 of 3 gives 2 of 3, and the next click ticks back.
- So once a count reaches target − 1, no row or editor action lowers it further.
- The 2 of 3 report: `fillStatus` in task-editor.js gives the tick button the icon of the status it leads to.
- At 2 of 3 that is the green completed check beside "Tick, 2 of 3"; the user confirmed seeing it there.
- The row icon at 2 of 3 is the correct in-progress icon.

### Status Model
Agreed with the user on 2026-11-16. The status still derives from the count, as the domain requires.

#### Task Row
| Status      | Click at target 1 | Click above target 1               |
| :---------- | :---------------- | :--------------------------------- |
| Ready       | `complete`        | `complete`, so 1 of 3, In progress |
| In progress | `complete`        | `complete`; Completed at target    |
| Completed   | nothing           | `complete`, so 4 of 3              |
| Cancelled   | nothing           | nothing; the count stays           |

- A closed recurring series takes no click; the editor reopens it.
- `x` on the focused row does what a click does.
- The status menu goes: no right-click, long press, Down, Up, Shift+F10, or Menu key menu.
- Its actions move to the task editor, including Complete for previous period.
- Every tick shows an Undo toast, which Ctrl+Z also runs, since a target 1 row cannot untick.
- Above target 1, the row shows the status icon and the counts, such as 0/3.
- The count chip becomes a button beside the open link, not inside it, and opens a popover: `[−] 2 of 3 [+]`.
- The popover is read-only while cancelled; minus is disabled at 0; plus always applies.
- Minus from 1 posts `uncomplete` then `start`, so the task stays In progress at 0.
- The row redesign discussion may change the row layout above; record its decisions here.

#### Task Editor Status
- Four icon state buttons in a group: Ready, In progress, Completed, and Cancelled.
- The current one is pressed (`aria-pressed`); each has its status name as accessible name and tooltip.
- A text line stays, such as "In progress, 2 of 3 done".
- A state button posts the events of `eventsTowardsStatus` in occurrences.js:
  - Ready resets the count to 0: one `uncomplete` per completion, or `unstart`.
  - Cancelled posts `cancel` and keeps the count.
  - Leaving Cancelled posts `reopen` first.
- Above target 1, Completed is disabled below target, with the tooltip "Reach 3 of 3 to complete".
- Above target 1, In progress is disabled at or above target; the stepper moves between the two.
- At target 1, every state button applies; Completed to In progress posts `uncomplete` then `start`.
- Above target 1 and outside Ready, a second line shows the stepper: `[−] 2 of 3 [+]`.
- The stepper follows the popover rules and never previews a status icon.
- A closed recurring series enables only Ready, which posts `reopen` and opens a fresh period.
- For 24 hours after a period ends, a Complete for previous period button names that occurrence.
- A viewer sees every control disabled (`SHR-4`).

#### Tabs
- Content: Description, Lists, and Notes.
- Status: Status, Target count, Due, Overdue behavior, and Repeat.
- History: History, then Details.
- The editor always opens on Content, keeping the description focus rule (`TSK-13`).
- Tabs follow the WAI-ARIA tabs pattern with the vendored src/vendor/design/js/tabs.js.
- Delete task moves to a More menu in the editor header, away from the notes.
- Escape still closes the editor, and the phone sheet keeps working.

### Implementation Tasks
- T0258: editor state buttons, stepper, and Complete for previous period.
- T0259: row tick rules and the Undo toast after every tick.
- T0260: removal of the row status menu.
- T0261: the count chip popover.
- T0262: the tabs, Details in History, and Delete in the header More menu.
- Each needs this task, directly or through its chain, so none starts before sign-off.

### Sign-Off
- The user approves the wireframes and the design text through `plan tasks review --approve`.
- After approval, revise T0258 to T0262 to the signed-off design, split along the size lines.

### Tests
- Unit test: none (design and documentation only).
- Integration test: none (design and documentation only); the wireframe script's own tests still pass.

Completion check: the user's sign-off, and `python -m pytest tests/test_draw_wireframes.py` passes.
