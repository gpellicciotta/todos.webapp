---
task: T0304
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T04:47:18Z
reviewed_commit: "1bb0432"
base_commit: "13cbcd1"
branch: task/T0304-sync-adr-0006-logs-undos-entries-and-statuses
---
# Review Findings: Task T0304 (Round 1)

## Summary
**[Decided]** Reject: pending log changes do not merge correctly with a pulled occurrence.

## Defects
- **Blocking — queued logs and undos are folded as check counts.** `src/js/sync/merge.js:200` uses `foldEvents` on the server occurrence. `src/js/core/occurrences.js:323` ignores unchecked logs and subtracts one for every undo. A pull during a pending amount or time log loses its progress and time; an undo of such an entry subtracts one instead of its value. Duplicate undos can subtract twice. This violates synchronization of logs, undos, progress, and time.

## Process Gaps
- Non-blocking: the changelog joins two bullets on one line.

## Required Rework
- Merge queued logs and undos using their target entries and the actual goal fold, including time, amount, reading, and duplicate undos. Add regression tests for a pull while these changes remain queued.
