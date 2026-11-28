---
id: T0306
owner: "@claude"
needs: []
branch: task/T0306-add-start-time-yearly-repeat-and-goal-sections
worktree: .plan/work/T0306-add-start-time-yearly-repeat-and-goal-sections
status: active
started_at: "2026-11-28T03:37:30Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0306: Rebuild the task editor as four tabs, with goals, recurrence, and start times on Configuration.

## Goals
Rebuild the task editor as the tabs Status, Notes, Configuration, and History, opening on Status.
Follow the Task Editor section of ui-design.md and `TSK-18`.
Move the notes to Notes, and put description, lists, goal, recurrence, time window, and Danger zone on Configuration.
Add the goal fields, the yearly unit, the start time, and the Fail overdue behavior, saved as lifecycle rule edits.
Keep today's status controls on the Status tab, without Cancel; T0307 replaces them.
Capture before and after screenshots of the task editor in light and dark themes.

## Task Execution Steps
- [ ] **[Read]**      Read the Task Editor section of ui-design.md, its wireframes, task-editor.js, and its tests.
- [ ] **[Implement]** Author failing unit and end-to-end tests for the tabs, goal, recurrence, time window, and Danger zone.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the tabs, the Configuration parts, validation, and rule edits.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots of the task editor in both themes.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
