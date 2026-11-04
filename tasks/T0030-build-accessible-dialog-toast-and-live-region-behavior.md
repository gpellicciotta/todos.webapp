---
id: T0030
owner: ~
needs: [T0010]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0030: Build accessible dialog, toast, and live region behavior modules with focus handling, split from T0010 for size

## Goals
Add behavior modules under `src/js/ui/` for dialogs, toasts, and a polite and assertive live region.
Dialogs use the native `<dialog>` element; toasts offer an optional Undo for 8 seconds.
Wire the gallery's dialog and toast specimens to these modules.
Split from T0010 on 2026-11-04 for size; the code was written during T0010.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the parked dialog, toast, and live region modules and their unit tests.
- [ ] **[Implement]** Take over the failing unit tests and write the gallery integration test.
- [ ] **[Verify]**    Run the tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Take over dialog.js, toast.js, and live-region.js, and wire the gallery specimens.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Document the modules' usage in visual-style-guide.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
