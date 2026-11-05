---
id: T0049
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
# T0049: Replace the + New List button with a subtle (+) button next to the Lists header

## Goals
Replace the wide New list button with a subtle (+) icon button next to the Lists header.
Add a visible Lists group header to the sidebar, with the icon button beside it.
The Lists screen button stays as it is.
Keep the accessible name "New list" and the existing route.
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js`

## Task Execution Steps
- [ ] **[Read]**      Read layout.js and the icon-button styles in controls.css.
- [ ] **[Implement]** Author tests: the (+) button is named New list, opens #/lists/new, and sits by the header.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Add the sidebar Lists header with a (+) icon button and remove the text button.
- [ ] **[Visual]**    Capture before and after screenshots in light and dark themes at two widths.
- [ ] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.
