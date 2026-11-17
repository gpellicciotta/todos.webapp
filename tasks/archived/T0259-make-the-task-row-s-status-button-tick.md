---
id: T0259
owner: "@claude"
session: claude-20261117-6c364e
needs: []
branch: task/T0259-make-the-task-row-s-status-button-tick
worktree: .plan/work/T0259-make-the-task-row-s-status-button-tick
status: completed
started_at: "2026-11-17T12:54:07Z"
ended_at: "2026-11-17T13:26:23Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 1684.7, input: 170, output: 48449, cache_read: 11624354, cache_write: 161818}
  review: {turns: 1, duration_s: 184.6, input: 45315, output: 2246, cache_read: 619264, cache_write: 0}
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T13:22:53Z"
reviewed_by: "@codex"
review_session: codex-20261117-4196ac
work_duration: 1926.4
completion-commit: 3871f9994d45df0d556786cfb1adc764c410bcc2
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
- [x] **[Read]**      Read T0257's signed-off brief, tickEvent, tick, and post in task-list.js.
- [x] **[Implement]** Author failing unit and e2e tests for the click rules, the inert states, and the Undo toast.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the click rules, the inert button states, and the Undo toast after every tick.
- [x] **[Verify]**    Run the unit suite and the All tasks and list e2e specs and confirm they pass.
- [x] **[Visual]**    Capture rows at targets 1 and 3 in each status, and the Undo toast, in both themes.
- [x] **[Doc]**       Update the Task Row section, TSK-4 in the requirements, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

- [2026-11-17] **[Implement]**
  Made tickEvent return complete or null, marked inert status buttons aria-disabled, and showed an Undo toast after every tick.
  - Status menu kept until T0260.
  - Viewers keep the disabled button (SHR-4).

- [2026-11-17] **[Verify]**
  Unit suite and the All tasks and list e2e specs pass; red-phase and green output is in validation-proof.md.
  - Full e2e: gallery toast test fails on main too, filed T0276.
  - Alt+Enter list test passed on rerun.

- [2026-11-17] **[Visual]**
  Captured rows at targets 1 and 3 in each status, and the tick toast, before and after, in both themes.
  - [After rows, light](T0259-make-the-task-row-s-status-button-tick/after-rows-light.png), [dark](T0259-make-the-task-row-s-status-button-tick/after-rows-dark.png).
  - [After toast, light](T0259-make-the-task-row-s-status-button-tick/after-toast-light.png), [dark](T0259-make-the-task-row-s-status-button-tick/after-toast-dark.png).
  - [Before toast, light](T0259-make-the-task-row-s-status-button-tick/before-toast-light.png), [dark](T0259-make-the-task-row-s-status-button-tick/before-toast-dark.png).

- [2026-11-17] **[Doc]**
  Updated the Task Row section, the status button style entry, TSK-4, and CHANGELOG.md with the inert state and toast messages.

- [2026-11-17] **[Decided]**
  Named inert buttons by status alone, such as 'Water the plants, completed', and logged six undeclared files in technical-spec.md.
  - Size note: 12 counted files, 296 lines cross the typical line.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 12.
  - Lines touched: 296.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @codex: [Decided]** Approved.
  - Findings: [review-findings-1.md](T0259-make-the-task-row-s-status-button-tick/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

