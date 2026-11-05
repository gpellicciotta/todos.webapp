---
id: T0050
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
# T0050: Style all Delete buttons with the danger color

## Goals
Give every Delete button and menu item the danger color: editor buttons, confirm dialogs, in-place confirms, menus, and the recycle bin.
Reuse the existing danger token and focus ring; keep contrast at 4.5:1 in both themes.
Completion check: `npm test` and `npx playwright test tests/e2e/gallery-danger.spec.js`

## Task Execution Steps
- [ ] **[Read]**      List every Delete control with grep and group it by component.
- [ ] **[Implement]** Author tests: each Delete control resolves to the danger color; others do not.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Add a filled danger button and a danger menu item variant to controls.css.
- [ ] **[Implement]** Apply the variants to every Delete control in the views.
- [ ] **[Doc]**       Show the variants in the style gallery and the visual style guide.
- [ ] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.
