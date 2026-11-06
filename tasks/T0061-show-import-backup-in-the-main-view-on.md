---
id: T0061
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
# T0061: Show Import backup in the main view on compact layouts, like the task and list editors

## Goals
On compact layouts, open Import backup in the main view, between the top bar and the bottom bar, as the editors do.
It shows an Import backup header with a close button, not a modal, with no scrim. Leaving the route cancels it.
Wide layouts keep the modal dialog.
Completion check: `npm test`, `npm run lint`, `npx playwright test`, and `npm run check:sw`.

## Task Execution Steps
- [ ] **[Read]**      Read import-dialog.js, dialog.js, the dialog CSS, and the Dialogs and Import designs.
- [ ] **[Implement]** Author unit and end-to-end tests for the in-view import on compact and the dialog on wide.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Open the import non-modally in the main view on compact layouts, with its styles.
- [ ] **[Verify]**    Run unit, end-to-end, Python, lint, and service worker checks and confirm they pass.
- [ ] **[Visual]**    Capture before and after screenshots of Import on compact and wide layouts.
- [ ] **[Doc]**       Update the style guide, UI design, import wireframe, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-06] **[Doc]**
  Companion task file scaffolded at task creation.
