---
id: T0307
owner: ~
needs: [T0306]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0307: Show progress and over-limit marks, a log form, and undoable entries for tasks per ADR-0006

## Goals
Show ADR-0006 progress and logs in the interface, per ui-design.md after T0300.
Task rows show progress toward the goal, an over-limit mark for open `at-most` windows, `failed`, and upcoming tasks.
Add the log form for a check, time spent, an amount, and a label; list entries in the editor with an undo action.
Show entries and undos in the task history.
Capture before and after screenshots of the list and the task editor in light and dark themes.

## Task Execution Steps
- [ ] **[Read]**      Read the Task Row, Task Editor, and Key Flows sections of ui-design.md and the views.
- [ ] **[Implement]** Author failing unit and end-to-end tests for row marks, the log form, entries, and history.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the row marks, the log form, the entries list with undo, and the history lines.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots of the list and editor in both themes.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
