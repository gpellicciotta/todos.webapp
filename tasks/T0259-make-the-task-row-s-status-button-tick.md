---
id: T0259
owner: "@claude"
needs: []
branch: task/T0259-make-the-task-row-s-status-button-tick
worktree: .plan/work/T0259-make-the-task-row-s-status-button-tick
status: active
started_at: "2026-11-17T12:54:07Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0259: Make the task row's status button tick by target, never untick, and offer Undo after every tick

## Goals
Make a click on the row's status button only ever tick, by the Task Row rules in T0257's signed-off brief.
- Target 1: Ready and In progress complete; Completed and Cancelled take no click.
- Above target 1: every click posts `complete`, also past the target, except while cancelled.
- `x` on the focused row does what a click does.
- Every tick shows an Undo toast, which Ctrl+Z also runs.
- The status menu stays until T0260.
- Rules and tests: [technical-spec.md](T0259-make-the-task-row-s-status-button-tick/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read T0257's signed-off brief, tickEvent, tick, and post in task-list.js.
- [ ] **[Implement]** Author failing unit and e2e tests for the click rules, the inert states, and the Undo toast.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the click rules, the inert button states, and the Undo toast after every tick.
- [ ] **[Verify]**    Run the unit suite and the All tasks and list e2e specs and confirm they pass.
- [ ] **[Visual]**    Capture rows at targets 1 and 3 in each status, and the Undo toast, in both themes.
- [ ] **[Doc]**       Update the Task Row section, TSK-4 in the requirements, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

