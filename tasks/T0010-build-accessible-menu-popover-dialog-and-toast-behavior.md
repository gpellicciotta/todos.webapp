---
id: T0010
owner: ~
needs: [T0008]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0010: Build accessible menu, popover, dialog, and toast behavior modules with keyboard and focus handling

## Goals
Add reusable behavior modules under `src/js/ui/` for menus, popovers, dialogs, toasts, and a polite live region.
Menus open on Enter or Space, move with arrow keys, close on Escape or an outside click, and return focus.
Dialogs use the native `<dialog>` element; toasts offer an optional Undo for 8 seconds.
Wire the gallery specimens to these modules.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read ui-design.md's Toasts, Dialogs, and Accessibility sections.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the menu, dialog, toast, and live region modules, and wire the gallery specimens.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Document the modules' usage in visual-style-guide.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
