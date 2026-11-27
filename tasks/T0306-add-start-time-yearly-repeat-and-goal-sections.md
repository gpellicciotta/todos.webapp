---
id: T0306
owner: ~
needs: [T0300, T0303]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0306: Add start time, yearly repeat, and goal sections to the task editor per ADR-0006

## Goals
Add the ADR-0006 sections to the task editor, per ui-design.md after T0300.
Add a start time, the yearly repeat unit, and a goal section with direction, measure, target, and unit.
Save them as lifecycle rule edits, validate them as the service does, and hide fields that do not apply.
Capture before and after screenshots of the task editor in light and dark themes.

## Task Execution Steps
- [ ] **[Read]**      Read the Task Editor section of ui-design.md, task-editor.js, and its tests.
- [ ] **[Implement]** Author failing unit and end-to-end tests for the start time, yearly repeat, and goal fields.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Add the sections, validation, and rule edits to the task editor.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots of the task editor in both themes.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
