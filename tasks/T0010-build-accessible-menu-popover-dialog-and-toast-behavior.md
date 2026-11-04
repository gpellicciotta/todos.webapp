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
- [ ] **[Implement]** Write the menu and popover modules, and wire the gallery specimens.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Document the modules' usage in visual-style-guide.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

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
