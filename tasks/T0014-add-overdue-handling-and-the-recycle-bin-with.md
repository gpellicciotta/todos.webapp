---
id: T0014
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
# T0014: Add overdue handling and the recycle bin with restore, permanent delete, and the 30-day purge

## Goals
Compute the overdue flag and cancel overdue tasks with behavior `cancel` (`OVD-1` to `OVD-6`).
Run the overdue check on start and every minute while the app is open.
Move deleted lists and tasks to the recycle bin, keeping memberships for restore (`BIN-1` to `BIN-6`, `LST-6`, `LST-7`, `TSK-11`).
Purge entries deleted more than 30 days ago.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the requirements' Overdue Handling and Recycle Bin sections and the service's business logic spec.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write overdue.js and bin.js, and route list and task deletion through the recycle bin.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
