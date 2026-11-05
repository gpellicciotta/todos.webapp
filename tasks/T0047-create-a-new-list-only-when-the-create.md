---
id: T0047
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
# T0047: Create a new list only when the Create button is clicked, not when the dialog is closed

## Goals
Create a new list only when the user clicks Create.
Closing the new-list editor with the x button or Escape creates nothing.
Editing an existing list still saves on change.
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

## Task Execution Steps
- [ ] **[Read]**      Read list-editor.js and editor-panel.js to see where creation fires today.
- [ ] **[Implement]** Author tests: closing a new list creates nothing; Create saves it; duplicates block Create.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Show a Create button in new mode, disabled until the name is valid, and stop auto-creation.
- [ ] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.
