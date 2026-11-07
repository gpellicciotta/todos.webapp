---
id: T0025
owner: ~
needs: ['T0058', 'T0062']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0025: Build sync upload: the change queue, first-connect adoption of local data, and rollback of rejected changes

## Goals
Queue every local change while connected and upload it in order, without duplicates on retry (`SYN-1`, `SYN-2`, `SYN-10`).
On first connect, upload all local data and merge local lists into same-named account lists (`CON-4`, `CON-5`).
Undo a change the service rejects and record it for the sync log (`SYN-9`).
Send only changed fields in updates, so per-field merge works (`SYN-5`), and sync from one tab only (`SYN-12`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the requirements' Sync section and the todos sync protocol spec from todos task T0136.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write the API client, the change queue, upload, and first-connect adoption.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
