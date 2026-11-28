---
task: T0304
round: 2
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T04:52:53Z
reviewed_commit: "13c61d5"
base_commit: "13cbcd1"
branch: task/T0304-sync-adr-0006-logs-undos-entries-and-statuses
---
# Review Findings: Task T0304 (Round 2)

## Summary
**[Decided]** Reject: the reworked fold can count the same log twice.

## Defects
- **Blocking — a queued log already present in the pulled entries is folded twice.** `src/js/sync/merge.js:200` concatenates pulled entries and queued logs without deduplicating their event IDs. A pull overlapping an upload can observe the accepted entry while it remains queued locally. The goal fold counts both copies, doubling progress and time until a later reconciliation. A direct fold with one checked, 30-second event repeated under the same ID produced progress 2 and 60 seconds. This violates correct synchronization of queued logs and occurrence progress.

## Process Gaps
- Non-blocking: round 1's changelog formatting issue remains.
- The full unit suite passed (2024 tests), and lint passed. The recorded post-rework contract suite passed 26 tests.

## Required Rework
- Deduplicate pulled and queued logs by event ID before folding. Add a regression test for an entry present both in the feed and the queue, including progress and time.