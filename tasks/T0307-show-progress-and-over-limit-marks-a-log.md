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
# T0307: Show progress, check off, a log form, and undoable entries on the task editor Status tab.

## Goals
Build the editor's Status tab and History lines, per the Task Editor section of ui-design.md (`TSK-21`, `TSK-22`).
Show the status line, progress box, pace, check off, stepper, Mark started, Reopen, and the previous period button.
Replace the status buttons with these actions.
Add the Log form, with the 12-hour question, and the current period's entries with Undo.
Show progress, entries, and undos in History.
Put the progress, approaching, and on-track rules in one core module that task rows can reuse (T0312).
Capture before and after screenshots of the task editor in light and dark themes.

## Task Execution Steps
- [ ] **[Read]**      Read the Task Editor and Key Flows sections of ui-design.md, the wireframes, and the views.
- [ ] **[Implement]** Author failing unit and end-to-end tests for pace, the Status tab, the Log form, and history.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the progress module, the Status tab, the Log form, entries with undo, and history lines.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots of the task editor in both themes.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
