---
id: T0300
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0300: Specify the ADR-0006 task editor sections, task row marks, and log form in the UI design and wireframes

## Goals
Specify the ADR-0006 interface of todos.server in docs/specs/ui-design.md and docs/requirements.md.
The task editor gets optional sections: a start time, repeat with a yearly unit, and a goal with direction, measure, target, and unit.
Task rows show progress toward the goal, an orange or red over-limit mark for open `at-most` windows, and `failed`.
A log form records a check, time spent, an amount, and a label; entries list in the editor with an undo action.
Update the wireframes through scripts/draw-wireframes.py.

## Task Execution Steps
- [ ] **[Read]**      Read ADR-0006, ui-design.md, the visual style guide, and the wireframe script.
- [ ] **[Doc]**       Update the Task Editor, Task Row, and Key Flows sections, and add the requirements.
- [ ] **[Doc]**       Update draw-wireframes.py for the editor sections, row marks, and log form, then regenerate.
- [ ] **[Verify]**    Run the wireframe tests and lint the specs.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
