---
id: T0064
owner: "@claude"
session: claude-20261107-572aaa
needs: []
branch: task/T0064-queue-and-sync-the-changes-of-a-backup
worktree: .plan/work/T0064-queue-and-sync-the-changes-of-a-backup
status: completed
started_at: "2026-11-07T20:23:03Z"
ended_at: "2026-11-07T20:38:30Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1439.6, input: 332, output: 126792, cache_read: 22676886, cache_write: 367242}
  review: {turns: 2, duration_s: 376.2, input: 173680, output: 7572, cache_read: 1587632}
review_status: approved
review_round: 1
reviewed_by: "@gemini"
work_duration: 926.0
completion-commit: 25ae1fc0e57e79e8dafd163602dfe3cb42bfc4cb
---
# T0064: Queue and sync the changes of a backup import while connected, comparing rows by last update

## Goals
While connected, send the changes of a backup import through the sync queue (`BAK-6`).
Per row, keep the version with the later `last-update-time`; a newer row sends all fields without an edit time, an older row sends nothing.
Imported notes create only missing notes, imported memberships only add, and lists owned by others never change.
Decide how overwrite mode behaves while connected before implementing.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the todos sync spec's Import While Connected, import-dialog.js, backup.js, and the queue API of T0025.
- [x] **[Decide]**    Decide what overwrite mode does while connected, since an import never removes server data.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Queue the import's changes per the decided rules, and show the sync progress.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update ui-design.md's import flow and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Placed in the Backlog: a gap found while reading the sync spec; promote it to v0.3.0 on the user's word.

- [2026-11-07] **[Decided]**
  Connected, Overwrite is disabled and refused by importBackup: an import never removes server data, and a local-only overwrite would diverge.
  - Entries built from final records, so renamed lists send final names.
  - applyChanges gets a queue option to enqueue atomically.

- [2026-11-07] **[Implement]**
  Queued connected merge imports in the import transaction; Overwrite is off while connected; the dialog shows Syncing then Synced.
  - Undeclared files: bulk.js, db.js, app.js, settings.js, three docs.
  - Size note: 13 files, 590 lines; one concern, not splittable.

- [2026-11-07] **[Verify]**
  Recorded task outcomes.
  - Files touched: 13.
  - Lines touched: 590.
  - Reopenings: 0.

- [2026-11-07] **[Verify]**
  Red run: 9 unit tests and the connected end-to-end test failed before the implementation.
  - See validation-proof.md.

- [2026-11-07] **[Verify]**
  Green run: 1033 unit tests, lint, and 172 end-to-end tests passed.
  - See validation-proof.md.

- [2026-11-07] **[Visual]**
  Screenshots: [before](T0064-queue-and-sync-the-changes-of-a-backup/connected-before-import.png), [after](T0064-queue-and-sync-the-changes-of-a-backup/connected-after-syncing.png), [synced](T0064-queue-and-sync-the-changes-of-a-backup/connected-after-synced.png).

- [2026-11-07] **[Doc]**
  Updated ui-design.md, backup-format.md, and CHANGELOG.md for the connected import.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 approved by @gemini: Approved.
  - Findings: [review-findings-1.md](T0064-queue-and-sync-the-changes-of-a-backup/review-findings-1.md).

- [2026-11-07] **[Complete]**
  Task completed successfully.

