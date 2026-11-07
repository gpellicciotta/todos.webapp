---
id: T0026
owner: ~
needs: [T0025]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0026: Build sync download: the change feed client, per-field merge, lost access handling, and the sync log store

## Goals
Pull remote changes through the service's change feed and apply them without a reload (`SYN-3`, `CON-6`).
Merge concurrent edits per field, keeping the most recent edit of each field (`SYN-5`, `SYN-6`).
Record overwritten values, rejected changes, lost access, and errors in a 30-day sync log store (`SYN-8`).
Remove lists and tasks the user lost access to (`SHR-8`), and handle disconnect data rules (`CON-8`, `CON-9`).
Run the sync engine: polling, expired cursors, and an unknown protocol (`SYN-3`, `SYN-11`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the requirements' Sync section and the todos change feed spec from todos task T0138.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the change feed client, the per-field merge, and the sync log store.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
