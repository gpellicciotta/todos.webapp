---
id: T0010
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T14:45:54Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the menu, dialog, toast, and live region modules, and wire the gallery specimens.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Document the modules' usage in visual-style-guide.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Read]**
  Read the Toasts, Dialogs, and Accessibility rules in ui-design.md, the component rules in visual-style-guide.md, and the menu, dialog, and toast CSS.

- [2026-11-04] **[Implement]**
  Wrote failing unit tests for the menu, popover, dialog, toast, and live region modules, with happy-dom as a per-file Vitest environment.
  - Added happy-dom 21 as a dev dependency.
  - Undeclared files: popover.js, dialog.test.js, live-region.test.js, package.json.

- [2026-11-04] **[Verify]**
  All four new suites failed to import their missing modules; validation-proof.md records the output.

- [2026-11-04] **[Implement]**
  Implemented the popover, menu, dialog, toast, and live region modules; 50 unit tests and ESLint pass.
  - Menu builds on the popover; dialog reuses its tabbable helper.

- [2026-11-04] **[Decide]**
  Size note: 1468 lines across 9 counted files before gallery and e2e work, above the large line and three times the estimate.
  - Needs human sign-off per sizing rules; orchestrator informed.

