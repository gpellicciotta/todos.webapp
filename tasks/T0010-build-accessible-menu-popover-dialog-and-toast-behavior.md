---
id: T0010
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T14:45:54Z"
ended_at: "2026-11-04T15:33:52Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 3cc2fe4645e54286065560da65223c233258356c
---
# T0010: Build accessible menu and popover behavior modules with keyboard and focus handling

## Goals
Add reusable behavior modules under `src/js/ui/` for menus and non-modal popovers.
Menus open on Enter or Space, move with arrow keys, close on Escape or an outside click, and return focus.
Wire the gallery's menu and popover specimens to these modules.
Split on 2026-11-04 for size: dialogs, toasts, and the live region moved to T0030.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's Toasts, Dialogs, and Accessibility sections.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the menu and popover modules, and wire the gallery specimens.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Document the modules' usage in visual-style-guide.md and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Read]**
  Read the Toasts, Dialogs, and Accessibility rules in ui-design.md, the component rules in visual-style-guide.md, and the menu, dialog, and toast CSS.

- [2026-11-04] **[Implement]**
  Wrote failing menu and popover unit tests in menu.test.js, with happy-dom as a per-file Vitest environment.
  - Added happy-dom 21 as a dev dependency.

- [2026-11-04] **[Verify]**
  The menu suite failed to import its missing modules; validation-proof.md records the output.

- [2026-11-04] **[Implement]**
  Implemented the popover and menu modules; the menu builds on the popover; 24 unit tests and ESLint pass.

- [2026-11-04] **[Decide]**
  Split for size on 2026-11-04: dialog, toast, and live region modules and tests moved to T0030.

- [2026-11-04] **[Implement]**
  Wrote behaviors.spec.js for the gallery's working menu and popover; all five tests failed before the wiring existed.

- [2026-11-04] **[Implement]**
  Added working menu and popover specimens, wired by visual-style-gallery-behaviors.js; controls.css now hides closed menus and popovers.
  - Undeclared files: src/css/controls.css, docs/specs/visual-style-guide.md.

- [2026-11-04] **[Verify]**
  Completion check passed: 434 unit tests, ESLint, and 50 end-to-end tests with E2E_PORT=8795.

- [2026-11-04] **[Doc]**
  Documented attachMenu and attachPopover usage in visual-style-guide.md; CHANGELOG.md is left to the orchestrator.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 9.
  - Lines touched: 928.
  - Reopenings: 0.
  - Size note: above the typical line, within the 820-line estimate's bounds.

- [2026-11-04] **[Review]**
  Agent review approved with minor notes on destroy() attributes, disabled item focus, and outside-click focus return.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 9.
  - Lines touched: 928.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

