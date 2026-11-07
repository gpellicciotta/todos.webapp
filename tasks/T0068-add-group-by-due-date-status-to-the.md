---
id: T0068
owner: "@claude"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-07T16:43:37Z"
ended_at: "2026-11-07T17:44:26Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 2
reviewed_by: "@giova"
completion-commit: 6fbdd27a35dbb379c6a85e94f2fa74dcc6378227
---
# T0068: Add Group by (Due date, Status) to the list view options so lists offer the All tasks options minus List

## Goals
Add Group by Due date and Status to the view options of a list, so a list offers the options of All tasks except the List grouping.
Grouped list rows keep the manual order inside each group and hide the drag handles and moves.
Requirements: LV-8, LV-11, VO-9.
Completion check: `npm test` and `npx playwright test`
Size estimate: 7 files, 150 lines

## Task Execution Steps
- [x] **[Read]**      Read the view options panel, the list view, and the grouping in the shared task list.
- [x] **[Implement]** Author unit tests for the list groupings, the panel, and the grouped list rows.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Offer Group by in the list panel, render groups in the list view, and hide the moves.
- [x] **[Verify]**    Run unit, lint, and end-to-end tests and confirm they pass.
- [x] **[Doc]**       Update the UI design, CHANGELOG.md, and the service worker version.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Verify]**
  Unit, lint, and end-to-end tests pass; committed on the task branch.
  - Files touched: 9.
  - Lines touched: 84.
  - Reopenings: 0.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Verify]**
  No before and after screenshots captured; automated tests cover the behavior.

- [2026-11-07] **[Review]**
  Round 1 approved by @giova.

- [2026-11-07] **[Review]**
  Review approved by the user in the session, recorded as @giova.

- [2026-11-07] **[Review]**
  Round 2 approved by @giova.

- [2026-11-07] **[Complete]**
  Task completed successfully.

