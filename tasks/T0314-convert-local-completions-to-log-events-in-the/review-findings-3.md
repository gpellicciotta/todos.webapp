---
task: T0314
round: 3
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T01:53:27Z
reviewed_commit: "f7827b0"
base_commit: "aa3f6b8"
branch: task/T0314-convert-local-completions-to-log-events-in-the
---
# Review Findings: Task T0314 (Round 3)

## Summary
**[Decided]** Reject: mixed histories can undo the wrong check. `npm test` passed 1,901 tests; `npm run lint` passed.

## Defects
- **Blocking — Legacy uncomplete targets the wrong live check in mixed histories.** `src/js/core/occurrences.js:700` tracks only legacy `complete` events in `live`; checked `log` events and `undo-log` events never update it. For a legacy complete `a`, checked log `b`, then legacy uncomplete, `foldLogCache` leaves `b` live and removes `a`. The uncomplete must remove the latest live check, `b`. If `b` carries time or an amount, the resulting totals are also wrong. Backup import and queue rollback both use this fold.

## Process Gaps
- None.

## Required Rework
- Track all applicable live checks and their undos when converting mixed histories. Add regression coverage for a legacy uncomplete following a checked log, and for existing undo-log events before a legacy uncomplete. Verify backup import and queue rollback preserve the correct entries and totals.