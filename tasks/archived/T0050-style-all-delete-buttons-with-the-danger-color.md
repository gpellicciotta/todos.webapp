---
id: T0050
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-05T18:25:21Z"
ended_at: "2026-11-05T18:54:51Z"
review: none
preview: none
protocol: adhoc
completion-commit: c73053f9d79ceb5fda1fea15d7e0f88ca4be7e9b
---
# T0050: Style all Delete buttons with the danger color

## Goals
Give every Delete button and menu item the danger color: editor buttons, confirm dialogs, in-place confirms, menus, and the recycle bin.
Reuse the existing danger token and focus ring; keep contrast at 4.5:1 in both themes.
Completion check: `npm test` and `npx playwright test tests/e2e/gallery-danger.spec.js`

## Task Execution Steps
- [x] **[Read]**      List every Delete control with grep and group it by component.
- [x] **[Implement]** Author tests: each Delete control resolves to the danger color; others do not.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Add a filled danger button and a danger menu item variant to controls.css.
- [x] **[Implement]** Apply the variants to every Delete control in the views.
- [x] **[Doc]**       Show the variants in the style gallery and the visual style guide.
- [x] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-05] **[Review]**
  Review lowered from agent to none by @gpellicciotta: These is a simple styling task.

- [2026-11-05] **[Verify]**
  Unit tests, lint, and end-to-end tests pass; Delete controls use danger variants.
  - Files touched: 22 (shared with T0052).
  - Lines touched: 449 (shared with T0052).
  - Reopenings: 0.

- [2026-11-05] **[Decided]**
  Used the danger color for Delete controls and Cancelled; completed rows strike through.

- [2026-11-05] **[Read]**
  Read the tokens, controls, and views.

- [2026-11-05] **[Implement]**
  Authored tests and verified they failed (53 failures).

- [2026-11-05] **[Implement]**
  Implemented tokens, CSS, and view changes.

- [2026-11-05] **[Visual]**
  Captured before and after screenshots in both themes; see validation-proof.md.

- [2026-11-05] **[Doc]**
  Updated style guide, ui-design, gallery, and CHANGELOG.

- [2026-11-05] **[Complete]**
  Task completed successfully.

