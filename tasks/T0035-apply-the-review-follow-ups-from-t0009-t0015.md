---
id: T0035
owner: ~
needs: [T0015]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0035: Apply the review follow-ups from T0009, T0015, T0032, and T0033 to the store, toasts, shell, and task row styles

## Goals
Apply the eight review follow-ups recorded in T0016's spec: subscriber errors, write notifications, Undo-only shortcuts, the Reload banner.
Also start-up order and failures, route focus and announcements, the theme-color meta, and the task row style fixes.
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
