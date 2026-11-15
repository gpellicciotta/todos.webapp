---
task: T0236
round: 1
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T12:30:36Z
reviewed_commit: "14dde2b"
base_commit: "4141dfc"
branch: task/T0236-write-backup-format-2-with-lifecycle-rules-occurrences
session: antigravity-20261115-1916b3
session_agent: antigravity
session_created_at: 2026-11-15T12:16:44Z
---
# Review Findings: Task T0236 (Round 1)

## Summary
Format 2 export, format 1 compatibility, ESLint, SW check, 1,431 unit tests, backup e2e, and 11 contract tests pass.
However, four defects in rule-edit replay, overwrite change detection, backup validation, and ended-recurrence synthesis require rework.

## Defects
- **Rule-edit replay**: overwrites winning lifecycle rules when rule-edit history is partial or merged (`BAK-6`, `BAK-8`, `BAK-14`).
  - `firstRules` and `replayEvents` in [occurrences.js](../../../src/js/core/occurrences.js) assume `edit-lifecycle-rules` events always end at the exported `lifecycle-rules`.
  - [tasks.js](../../../src/js/store/tasks.js) `updateTask` edits deadlines without rule-edit events, and connected pulls update `lifecycle-rules` without remote events.
  - When an older `edit-lifecycle-rules` event precedes a later unlogged rule change, `rebuildTask` in [backup.js](../../../src/js/core/backup.js) reverts to the older event's value.
  - Connected `importEntries` in [queue.js](../../../src/js/sync/queue.js) likewise uploads only the partial `edit-lifecycle-rules` events instead of the final exported rules.
  - In merge mode, `rebuildTask` replays losing local `edit-lifecycle-rules` events over a newer backup task, corrupting its winning `lifecycle-rules`.
- **Overwrite task comparison**: skips existing tasks whose header and `lifecycle-rules` match, ignoring `events` and `occurrences` (`BAK-8`, `BAK-14`).
  - `SHAPES[2].fields.tasks` and `planImport` in [backup.js](../../../src/js/core/backup.js) compare only task header fields and `lifecycle-rules`.
  - When those fields match, `planImport` marks the task `skipped` and never calls `rebuildTask`.
  - Overwrite imports therefore fail to restore missing backup `events` and past `occurrences`, or remove extra local events.
- **Rule-edit validation**: `validateBackup` does not validate `old` and `new` rule values in `edit-lifecycle-rules` event `details` (`BAK-12`, `BAK-13`).
  - `checkDetails` in [backup.js](../../../src/js/core/backup.js) checks field names and `old`/`new` keys without validating rule types, ranges, dates, enums, or timezones.
  - Invalid recurrence units, intervals, or timezones in `details` pass `parseBackup` and later throw uncaught `RangeError` exceptions in [periods.js](../../../src/js/core/periods.js).
  - Other invalid rule values (such as negative `target-count` or non-ISO `due-time`) write corrupt rules into IndexedDB.
- **Ended-recurrence synthesis**: `missingEvents` mishandles recurring tasks whose exported final occurrence ended via `end-recurrence` (`BAK-14`).
  - `missingEvents` in [backup.js](../../../src/js/core/backup.js) rolls over only to `wanted['start-time']`, never closing an ended series at `wanted['due-time']`.
  - An exported `completed` final occurrence without local events imports with `close-time: null` instead of closing via `end-recurrence`.
  - An exported unmet `cancelled` final occurrence synthesizes a user `cancel` event instead of `end-recurrence`, and uploads `cancel` while connected.

## Process Gaps
- **Task size approval**: task size exceeds the large-task threshold without size approval.
  - `plan tasks status T0236 --verbose` reports 12 files and 1,324 lines (estimated 6 files, 500 lines, not approved).

## Required Rework
- Preserve the winning `lifecycle-rules` across `rebuildTask` in [backup.js](../../../src/js/core/backup.js), `replayEvents` in [occurrences.js](../../../src/js/core/occurrences.js), and `importEntries` in [queue.js](../../../src/js/sync/queue.js):
  - Ensure partial `edit-lifecycle-rules` histories still reach the exported `lifecycle-rules` both locally and when replayed while connected.
  - Ensure merge mode never lets older local `edit-lifecycle-rules` events overwrite a newer backup task's `lifecycle-rules`.
- Update overwrite comparison in [backup.js](../../../src/js/core/backup.js) so tasks with differing `events` or rebuilt `occurrences` still rebuild and sync local stores.
- Validate `old` and `new` rule values in `checkDetails` in [backup.js](../../../src/js/core/backup.js), rejecting invalid values with `BackupError` and field paths.
- Fix `missingEvents` in [backup.js](../../../src/js/core/backup.js) so ended recurring series close via `end-recurrence` at `due-time` without fabricating user `cancel` events.
- Add unit and contract regression tests covering all four defects, and rerun lint, SW, unit, contract, and e2e checks.
