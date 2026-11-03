---
id: T0021
owner: ~
needs: [T0012, T0013, T0014]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0021: Define the JSON backup file format and implement export, and import in merge and overwrite modes

## Goals
Write docs/specs/backup-format.md for the JSON backup file, with its format version (`BAK-2`, `BAK-3`).
Export all stored data to that format (`BAK-1`, `BAK-4`).
Import in merge mode by identifier, newest version winning, and in overwrite mode (`BAK-6` to `BAK-9`).
Preview an import as counts before applying it, and reject invalid files unchanged (`BAK-11`, `BAK-13`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the requirements' Backup and Restore section and the service's import and export formats.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write backup-format.md and backup.js with export, import preview, merge, and overwrite.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Link backup-format.md from docs/index.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
