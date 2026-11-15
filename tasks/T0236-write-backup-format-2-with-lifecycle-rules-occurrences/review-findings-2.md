---
task: T0236
round: 2
verdict: rejected
reviewer: "@gemini"
reviewed_at: 2026-11-15T14:17:53Z
reviewed_commit: "2ea366d"
base_commit: "4a2896e"
branch: task/T0236-write-backup-format-2-with-lifecycle-rules-occurrences
---
# Review Findings: Task T0236 (Round 2)

## Summary
Round 1 fixes, size approval, ESLint, SW check, 1,472 unit tests, 11 e2e tests, and 15 contract tests pass.
Two defects in connected global-note import and partial rule replay, plus changelog consolidation, require rework.

## Defects
- **Connected global-note import**: drops explicit `occurrence: null` on recurring tasks (`NOT-6`, `BAK-6`).
  - In [queue.js](../../../src/js/sync/queue.js), `importEntries` includes `occurrence` only when `Number.isInteger(note.occurrence)`.
  - Replaying a format 2 global note (`occurrence: null`) omits `occurrence` from `POST /api/tasks/{{id}}/notes`.
  - `todos.server` (`TaskNoteLinks.resolve`) then links the note to the occurrence covering `creation-time` instead of keeping it global.
- **Rule shape validation and partial replay**: produces invalid one-off or recurring rule shapes (`BAK-6`, `BAK-13`, `BAK-14`).
  - In [backup.js](../../../src/js/core/backup.js), `checkRules` accepts non-null recurrence fields on one-off rules (`recurrence-unit: null`) and silently clears recurring deadlines.
  - In [occurrences.js](../../../src/js/core/occurrences.js), `normalizeRules` clears `due-time` and `overdue-handling` when recurring, without clearing recurrence fields when one-off.
  - Undoing partial `edit-lifecycle-rules` events across an unlogged one-off/recurring change in `firstRules` can yield `recurrence-unit` with `timezone: null`.
  - `firstOccurrence` then throws an uncaught `RangeError` in [periods.js](../../../src/js/core/periods.js) during both local and connected imports.
  - Conversely, undoing or replaying partial recurrence edits onto one-off rules leaves recurrence fields without `recurrence-unit`.
  - Connected `POST /api/tasks` and `PATCH /api/tasks/{{id}}/lifecycle-rules` in [queue.js](../../../src/js/sync/queue.js) then fail on `todos.server` with `400 Bad Request`.

## Process Gaps
- **Changelog consolidation**: [CHANGELOG.md](../../../CHANGELOG.md) appends three Round 1 fix bullets instead of consolidating unreleased deliverables, leaving `end-recurrence` unbackticked.

## Required Rework
- Send `occurrence: note.occurrence ?? null` in `importEntries` in [queue.js](../../../src/js/sync/queue.js) when `replay` is `true`, keeping format 1's omission otherwise.
- Reject incompatible one-off and recurring rule fields in `checkRules` in [backup.js](../../../src/js/core/backup.js), with `BackupError` field paths.
- Clear recurrence fields and default `overdue-handling` on one-off rules in `normalizeRules` and `applyRuleEdit` in [occurrences.js](../../../src/js/core/occurrences.js).
- Guard `firstRules` and `replayEvents` in [occurrences.js](../../../src/js/core/occurrences.js) when partial rule edits lack valid recurrence state across one-off/recurring transitions.
  - Ensure neither `firstRules` nor replayed rule edits produce recurring rules without `timezone`/`recurrence-interval` or recurrence edits on one-off rules.
- Consolidate the format 2 bullets in [CHANGELOG.md](../../../CHANGELOG.md) into net deliverables under `change-management-guidelines` (`<= 20` words, code terms backticked).
- Add unit and contract regression tests for both defects, then rerun lint, SW, unit, contract, and e2e checks.
