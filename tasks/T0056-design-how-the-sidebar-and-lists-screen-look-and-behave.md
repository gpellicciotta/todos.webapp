---
id: T0056
owner: "@claude"
session: claude-20261107-506076
needs: []
branch: task/T0056-design-how-the-sidebar-and-lists-screen-look-and-behave
worktree: .plan/work/T0056-design-how-the-sidebar-and-lists-screen-look-and-behave
status: completed
started_at: "2026-11-07T21:40:14Z"
ended_at: "2026-11-07T22:54:17Z"
review: human
preview: none
protocol: standard
size_status: approved
size_estimate: 21 files, 656 lines
usage:
  worker: {turns: 4, duration_s: 1372.8, input: 216, output: 127756, cache_read: 14127246, cache_write: 341572}
work_duration: 686.5
size_approved: 21 files, 656 lines
size_approved_by: "@gpellicciotta"
size_approved_at: "2026-11-07T21:28:08Z"
review_status: approved
review_round: 1
reviewed_by: "@gpellicciotta"
completion-commit: 0974b7c70edfe68a19c8e4b41b6c2460ea5c836b
---
# T0056: Design how the sidebar and Lists screen look and behave with many lists, 100 and more.

## Goals
Design how the wide sidebar and the Lists screen look and behave with 100 or more lists.
Cover scrolling, finding a list, ordering with T0046, counts, keyboard use, and empty or filtered states.
Keep TEC-16: views open within 200 ms with 150 lists and 5000 tasks.
Write each decision into ui-design.md and its wireframes, and name the requirements to add.
Create the implementation tasks; this task changes no app code.
See technical-spec.md for constraints and the questions to decide.
Completion check: `python scripts/draw-wireframes.py docs/img/ui`, `python -m pytest tests`, and `ruff check scripts tests`.

## Task Execution Steps
- [x] **[Read]**      Read Navigation Rules, Lists Overview, the wide layout, the User Menu, and requirements LST-5 and TEC-16.
- [x] **[Decide]**    Decide how the sidebar behaves with 100 or more lists, using the questions in technical-spec.md.
- [x] **[Decide]**    Decide how the Lists screen finds, orders, and renders 100 or more lists.
- [x] **[Doc]**       Write the decisions into ui-design.md, and add the requirements to requirements.md.
- [x] **[Doc]**       Redraw the wireframes with draw-wireframes.py, then run pytest and ruff on the scripts.
- [x] **[Doc]**       Create the implementation tasks, including a 150-list render check, and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file written by hand: the plan CLI cannot scaffold a file for an existing task line.

- [2026-11-07] **[Decided]**
  Scope changed from the sidebar's scrolling to many lists everywhere: the user menu already holds Recycle bin and Settings.

- [2026-11-07] **[Review]**
  Review raised from agent to human.

- [2026-11-07] **[Read]**
  Read Navigation Rules, Lists Overview, layout, user menu, LST-5, TEC-16, and the sidebar and lists code.
  - Found the sidebar New list button was removed earlier; docs and wireframes were stale.

- [2026-11-07] **[Decided]**
  Sidebar: only lists scroll under a fixed header; find field from 12 lists; flat list without groups; manual order stays the pin; patch rows in place.

- [2026-11-07] **[Decided]**
  Lists screen: pinned find bar, sort menu, info line, Create list offer, content-visibility rows, Alt+Shift moves, one-pass counts, 200 ms budget at 150 lists.

- [2026-11-07] **[Doc]**
  Wrote ui-design.md sections, LST-10 to LST-16, TEC-16 at 150 lists, style guide notes, and the lists-many and lists-find wireframes.

- [2026-11-07] **[Doc]**
  Created T0071 to T0078 in Backlog with technical specs; T0065 release does not wait for them.
  - T0078 waits for T0028.

- [2026-11-07] **[Verify]**
  Recorded task outcomes; wireframes, pytest, and ruff pass.
  - Files touched: 6.
  - Lines touched: 351.
  - Reopenings: 0.

- [2026-11-07] **[Size]**
  Size approval requested by the work loop: 21 files, 656 lines exceeds 3x the approved 5 files, 250 lines.

- [2026-11-07] **[Size]**
  Size approved by @gpellicciotta for 21 files, 656 lines.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: human).

- [2026-11-07] **[Review]**
  Round 1 approved by @gpellicciotta: The design with a list search for large numbers of lists is approved.

- [2026-11-07] **[Complete]**
  Task completed successfully.

