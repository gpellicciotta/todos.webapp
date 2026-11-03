---
id: T0013
owner: ~
needs: [T0011]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0013: Add fractional-index manual ordering per list, and the task query functions for filters and sorting

## Goals
Add base-62 fractional-index keys compatible with the service's positions (`LV-2` to `LV-5`).
Move a task before or after a neighbor within one list without touching other lists.
Add query functions for the filters and sorts of All tasks and the list view (`TV-2` to `TV-10`, `LV-6`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the requirements' List View and Task View sections and the service's ordering rules.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write fractional-index.js, the move operation, and the query and sort functions.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
