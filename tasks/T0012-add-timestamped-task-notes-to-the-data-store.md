---
id: T0012
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
# T0012: Add timestamped task notes to the data store, updating each task's last activity time

## Goals
Add a notes store with create, edit, delete, and list-by-task, newest first (`NOT-1` to `NOT-4`).
Each note records its text, creation time, last edit time, and an optional author.
Adding, editing, or deleting a note updates its task's last activity time (`NOT-5`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the requirements' Notes section and the store modules from the data store task.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Add the notes store and its schema upgrade, and update the task last activity time.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update docs/specs/local-store.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
