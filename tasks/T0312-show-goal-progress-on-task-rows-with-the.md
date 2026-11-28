---
id: T0312
owner: ~
needs: [T0307]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0312: Show goal progress on task rows, with the quick log, Failed status, and upcoming tasks

## Goals
Show ADR-0006 goals on task rows and in views, per the Task Row, Quick Log, and View Options parts of ui-design.md.
Rows show the meter, progress, logged time, the new status icons, Failed, over-limit and behind-pace marks, and upcoming starts.
The status button logs a check or opens the quick log by goal, and its Undo toast posts `undo-log` (`TSK-4`, `TSK-21`).
View options add the Failed status, the finished-today brace, Show upcoming, the Upcoming group, and group by status.
Reuse the progress module and the log fields of T0307.
Capture before and after screenshots of the lists and view options in light and dark themes.

## Task Execution Steps
- [ ] **[Read]**      Read the Task Row, Quick Log, View Options, and Key Flows sections, the wireframes, and the views.
- [ ] **[Implement]** Author failing unit and end-to-end tests for row marks, clicks per goal, the quick log, and views.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the row marks, the quick log, the undo toast, and the view options.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots of the lists and view options in both themes.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.
