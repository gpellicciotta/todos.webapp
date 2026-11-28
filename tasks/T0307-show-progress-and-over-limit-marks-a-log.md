---
id: T0307
owner: "@claude"
session: claude-20261128-d09379
needs: []
branch: task/T0307-show-progress-and-over-limit-marks-a-log
worktree: .plan/work/T0307-show-progress-and-over-limit-marks-a-log
status: active
started_at: "2026-11-28T04:57:02Z"
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
- [x] **[Read]**      Read the Task Editor and Key Flows sections of ui-design.md, the wireframes, and the views.
- [x] **[Implement]** Author failing unit and end-to-end tests for pace, the Status tab, the Log form, and history.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the progress module, the Status tab, the Log form, entries with undo, and history lines.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots of the task editor in both themes.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Read]**
  Read ui-design Task Editor, store log API, editor, history, and tests; progress module and unit tests written.

- [2026-11-28] **[Verify]**
  New unit and e2e tests fail for missing Status tab features: 28 unit, 2 e2e.

