---
id: T0258
owner: "@claude"
session: claude-20261117-30a21f
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
- [x] **[Read]**      Read T0257's signed-off brief, fillStatus in task-editor.js, and eventsTowardsStatus in occurrences.js.
- [x] **[Implement]** Author failing unit tests for the state buttons, disabled rules, stepper, and previous period button.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the state buttons and the stepper with the vendored segmented and icon button styles.
- [x] **[Verify]**    Run the unit suite and the task editor e2e spec and confirm they pass.
- [x] **[Visual]**    Capture the status section in each status at targets 1 and 3, in light and dark themes.
- [x] **[Doc]**       Update the Task Editor section, the requirements, the gallery, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

- [2026-11-16] **[Doc]**
  Kept the stepper inside the editor, since T0261's row popover was cancelled.

- [2026-11-17] **[Decided]**
  Named the Ready button To do, matching the status line, and gave disabled In progress the tooltip 'Step below 3 of 3 to be in progress'.

- [2026-11-17] **[Implement]**
  Replaced the tick and event action buttons with four state buttons, a count stepper, and Complete for previous period.
  - Added a minus sprite icon and bumped the service worker VERSION.

- [2026-11-17] **[Verify]**
  Ten new unit tests failed first, then passed; 1726 unit tests, 12 task editor e2e tests, and 52 gallery e2e tests pass.

- [2026-11-17] **[Visual]**
  Captured the status section per status at targets 1 and 3, light and dark, before and after; see validation-proof.md.
  - [Before, light](T0258-replace-the-task-editor-s-status-actions-with/before-status-light.png), [before, dark](T0258-replace-the-task-editor-s-status-actions-with/before-status-dark.png)
  - [After, light](T0258-replace-the-task-editor-s-status-actions-with/after-status-light.png), [after, dark](T0258-replace-the-task-editor-s-status-actions-with/after-status-dark.png)

- [2026-11-17] **[Doc]**
  Updated the UI design status part, the style guide, the gallery, and CHANGELOG.md; requirements already matched.

- [2026-11-17] **[Verify]**
  Size note: measured 10 counted files and 583 lines, above the typical line, since tests and styles cannot merge apart.
  - Files touched: 10.
  - Lines touched: 583.
  - Reopenings: 0.

