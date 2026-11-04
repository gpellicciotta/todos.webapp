---
id: T0021
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T14:43:25Z"
ended_at: —
review: agent
preview: none
protocol: standard
review_status: rejected
review_round: 1
reviewed_by: "@claude-review-agent"
---
# T0021: Define the JSON backup file format and implement export, and import in merge and overwrite modes

## Goals
Write docs/specs/backup-format.md for the JSON backup file, with its format version (`BAK-2`, `BAK-3`).
Export all stored data to that format (`BAK-1`, `BAK-4`).
Import in merge mode by identifier, newest version winning, and in overwrite mode (`BAK-6` to `BAK-9`).
Preview an import as counts before applying it, and reject invalid files unchanged (`BAK-11`, `BAK-13`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Backup and Restore section and the service's import and export formats.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write backup-format.md and backup.js with export, import preview, merge, and overwrite.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Link backup-format.md from docs/index.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Verify]**
  Wrote 35 tests in backup.test.js with the backup-v1.json fixture; the suite failed to load because backup.js did not exist.

- [2026-11-04] **[Implement]**
  Added backup-format.md, backup.js with export, validation, preview, merge, and overwrite, and store snapshot and applyChanges operations; about 1300 lines in 8 files.
  - Size: backup.js 613, tests 392, spec 128, fixture 102, bulk.js 67 lines.
  - A pure planImport computes writes and counts; preview and import share it.
  - applyChanges reads, plans, and writes in one transaction.
  - Name clashes rename the imported list with a numeric suffix.
  - Counts add removed for memberships and notes that overwrite deletes.

- [2026-11-04] **[Verify]**
  Backup and store tests passed, 188 in 7 files, with eslint on src/js and tests/unit and the markdown linter on docs.
  - Full npm test fails only in other agents' ui and token tests.

- [2026-11-04] **[Doc]**
  Linked backup-format.md from docs/index.md and added a Bulk Operations section to local-store.md; CHANGELOG.md was left for the caller.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 rejected by @claude-review-agent: Import trims list descriptions, breaking the BAK-14 round trip; invalid fractional-index positions are accepted (BAK-13); minor: impossible dates, name clash with binned lists, owner id types.

