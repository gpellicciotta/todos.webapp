---
id: T0258
owner: "@claude"
needs: []
branch: task/T0258-replace-the-task-editor-s-status-actions-with
worktree: .plan/work/T0258-replace-the-task-editor-s-status-actions-with
status: active
started_at: "2026-11-17T12:32:48Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0258: Replace the task editor's status actions with four state buttons and a count stepper, as designed in T0257

## Goals
Replace the editor's status action buttons with four state buttons and, above target 1, a count stepper.
- Follow the Task Editor Status rules in T0257's signed-off brief.
- Ready resets the count to 0, Cancelled keeps it, and leaving Cancelled reopens first.
- Above target 1, Completed is disabled below target, and In progress at or above it.
- No control previews a status icon, which caused the 2 of 3 report.
- Complete for previous period joins the status section; the row menu keeps it until T0260.
- Rules and tests: [technical-spec.md](T0258-replace-the-task-editor-s-status-actions-with/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read T0257's signed-off brief, fillStatus in task-editor.js, and eventsTowardsStatus in occurrences.js.
- [ ] **[Implement]** Author failing unit tests for the state buttons, disabled rules, stepper, and previous period button.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the state buttons and the stepper with the vendored segmented and icon button styles.
- [ ] **[Verify]**    Run the unit suite and the task editor e2e spec and confirm they pass.
- [ ] **[Visual]**    Capture the status section in each status at targets 1 and 3, in light and dark themes.
- [ ] **[Doc]**       Update the Task Editor section, the requirements, the gallery, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

- [2026-11-16] **[Doc]**
  Kept the stepper inside the editor, since T0261's row popover was cancelled.

