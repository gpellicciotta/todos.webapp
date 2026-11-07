---
id: T0069
owner: "@claude"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-07T16:48:46Z"
ended_at: "2026-11-07T17:53:02Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 2
reviewed_by: "@giova"
completion-commit: d49b618e381915052633ba258ce339688ae046e4
---
# T0069: Make the Lists screen reorder by grips only and add a More menu per list with the list view actions

## Goals
Make the Lists screen reorder only by the grips at the left of each row, and remove the Move up and Move down buttons.
Add a More button at the right of each row with the menu of the List screen: Edit list, Edit view options, Share list, Delete list.
Requirements: LST-8, LST-9 (new), VO-4.
Completion check: `npm test` and `npx playwright test`
Size estimate: 10 files, 250 lines

## Task Execution Steps
- [x] **[Read]**      Read the Lists screen, the List screen menu, the reorder behavior, and the row styles.
- [x] **[Implement]** Author unit tests for the row menu, the missing move buttons, and Alt+Arrow moves.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Share the list menu, add the row More button, remove the move buttons, show grips on touch.
- [x] **[Verify]**    Run unit, lint, and end-to-end tests and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots in light and dark, wide and compact.
- [x] **[Doc]**       Update requirements, the UI design, CHANGELOG.md, and the service worker.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Verify]**
  Unit, lint, and end-to-end tests pass; screenshots stored in the task folder.
  - Files touched: 11.
  - Lines touched: 338.
  - Reopenings: 0.

- [2026-11-07] **[Decided]**
  Size note: diff above the typical line since the menu moved into a shared module and tests were rewritten.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 approved by @giova.

- [2026-11-07] **[Review]**
  Review approved by the user in the session, recorded as @giova.

- [2026-11-07] **[Review]**
  Round 2 approved by @giova.

- [2026-11-07] **[Complete]**
  Task completed successfully.

