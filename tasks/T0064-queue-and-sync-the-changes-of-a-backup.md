---
id: T0064
owner: ~
needs: ['T0025']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0064: Queue and sync the changes of a backup import while connected, comparing rows by last update

## Goals
While connected, send the changes of a backup import through the sync queue (`BAK-6`).
Per row, keep the version with the later `last-update-time`; a newer row sends all fields without an edit time, an older row sends nothing.
Imported notes create only missing notes, imported memberships only add, and lists owned by others never change.
Decide how overwrite mode behaves while connected before implementing.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the todos sync spec's Import While Connected, import-dialog.js, backup.js, and the queue API of T0025.
- [ ] **[Decide]**    Decide what overwrite mode does while connected, since an import never removes server data.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Queue the import's changes per the decided rules, and show the sync progress.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update ui-design.md's import flow and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Placed in the Backlog: a gap found while reading the sync spec; promote it to v0.3.0 on the user's word.
