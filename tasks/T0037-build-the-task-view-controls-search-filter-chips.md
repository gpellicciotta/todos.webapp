---
id: T0037
owner: ~
needs: [T0036]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0037: Build the task view controls: search, filter chips with popovers, the sort menu, and per-device preferences

## Goals
Build `src/js/views/view-controls.js`: search, Lists, Status, Due, and Created filter chips, Sort, and Clear all (`TV-2` to `TV-9`).
Build `src/js/core/preferences.js` with safe per-device reads and writes, reused by the Settings screen (`TV-12`).
Split from T0016 on 2026-11-04 for size; the code was written during T0016.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the code written during T0016 that this split task takes over.
- [ ] **[Implement]** Take over the failing tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the tests against the previous stage, confirm they fail, and record the output.
- [ ] **[Implement]** Take over the implementation from the T0016 working tree.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
