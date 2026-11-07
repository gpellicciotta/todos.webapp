---
id: T0067
owner: "@claude"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-07T16:30:41Z"
ended_at: "2026-11-07T17:34:20Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@giova"
completion-commit: ad6c712e7d11a2e65d83679cb03cbdebeac2c24b
---
# T0067: Default All tasks to Created newest first, and open the task editor after Add

## Goals
Default All tasks to creation time descending, so a new task comes first in the list.
Open the task editor on a new task right after Add, in All tasks and in every list, with the focus in the editor.
List views keep Manual order as their default. Requirements: TV-13 and TSK-13, new in this task.
Completion check: `npm test` and `npx playwright test`
Size estimate: 15 files, 300 lines

## Task Execution Steps
- [x] **[Read]**      Read query.js, the view state, the add bar, and the All tasks and list views.
- [x] **[Implement]** Author unit tests for the default order, the editor route after Add, and the focus.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Change DEFAULT_ORDER, and open the editor of the new task after Add in both views.
- [x] **[Verify]**    Run unit, lint, and end-to-end tests and confirm they pass.
- [x] **[Doc]**       Update requirements, the UI design, CHANGELOG.md, and the service worker version.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Verify]**
  Unit, lint, and end-to-end tests pass; committed on the task branch.
  - Files touched: 17.
  - Lines touched: 197.
  - Reopenings: 0.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Verify]**
  No before and after screenshots captured; automated tests cover the behavior.

- [2026-11-07] **[Review]**
  Round 1 approved by @giova.

- [2026-11-07] **[Review]**
  Review approved by the user in the session, recorded as @giova.

- [2026-11-07] **[Complete]**
  Task completed successfully.

