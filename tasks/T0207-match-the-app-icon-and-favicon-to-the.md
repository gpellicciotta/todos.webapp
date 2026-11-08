---
id: T0207
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-08T07:16:51Z"
ended_at: "2026-11-08T07:19:24Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-code-reviewer"
completion-commit: 5ab34d22103f7972ccc54064ae50a94e1f2a3c54
---
# T0207: Match the app icon and favicon to the Todos tile of the apps portal

## Goals
Draw the portal's Todos glyph, a navy checklist box with a green check, inside the white hexagon.
Keep one source file, `src/img/app-icon.svg`, for the favicon and both manifest PNGs.
Completion check: `npm run check:sw` and the unit tests pass, and the rendered icons show the glyph.
Size estimate: 4 files, 40 lines

## Task Execution Steps
- [x] **[Implement]** Redraw app-icon.svg and render the PNG icons.
- [x] **[Implement]** Bump the service worker VERSION and update the hash manifest.
- [x] **[Verify]**    Run check:sw and the unit tests, and view the rendered icons.
- [x] **[Doc]**       Update devops.md icon text and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-08] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-08] **[Verify]**
  Rendered icons show the glyph; check:sw and 1170 unit tests pass.
  - Files touched: 7.
  - Lines touched: 20.
  - Reopenings: 0.

- [2026-11-08] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-08] **[Review]**
  Round 1 approved by @claude-code-reviewer.

- [2026-11-08] **[Complete]**
  Task completed successfully.

