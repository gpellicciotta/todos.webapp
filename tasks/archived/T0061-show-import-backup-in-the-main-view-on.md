---
id: T0061
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-06T13:11:40Z"
ended_at: "2026-11-06T13:27:37Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-subagent"
completion-commit: 8011f35da45e8a96782bab5d9e48f7d0359466e4
---
# T0061: Show Import backup in the main view on compact layouts, like the task and list editors

## Goals
On compact layouts, open Import backup in the main view, between the top bar and the bottom bar, as the editors do.
It shows an Import backup header with a close button, not a modal, with no scrim. Leaving the route cancels it.
Wide layouts keep the modal dialog.
Completion check: `npm test`, `npm run lint`, `npx playwright test`, and `npm run check:sw`.

## Task Execution Steps
- [x] **[Read]**      Read import-dialog.js, dialog.js, the dialog CSS, and the Dialogs and Import designs.
- [x] **[Implement]** Author unit and end-to-end tests for the in-view import on compact and the dialog on wide.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Open the import non-modally in the main view on compact layouts, with its styles.
- [x] **[Verify]**    Run unit, end-to-end, Python, lint, and service worker checks and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots of Import on compact and wide layouts.
- [x] **[Doc]**       Update the style guide, UI design, import wireframe, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-06] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-06] **[Implement]**
  Opened the compact import in the main view; added modal false, the in-view style, gallery specimen, and wireframe.
  - Undeclared files: app-shell.css, gallery html, gallery spec.

- [2026-11-06] **[Size]**
  Size note: 15 counted files and 337 lines, above the typical line; three undeclared files.

- [2026-11-06] **[Verify]**
  Recorded task outcomes.
  - Files touched: 15.
  - Lines touched: 337.
  - Reopenings: 0.

- [2026-11-06] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-06] **[Review]**
  Independent review approved. Its inert-main and resize findings were fixed afterwards, with failing tests first.

- [2026-11-06] **[Verify]**
  Final task outcomes, replacing the earlier count.
  - Files touched: 15.
  - Lines touched: 442.
  - Reopenings: 0.

- [2026-11-06] **[Review]**
  Round 1 approved by @claude-subagent.

- [2026-11-06] **[Complete]**
  Task completed successfully.

