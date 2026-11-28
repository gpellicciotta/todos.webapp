---
task: T0306
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T04:10:01Z
reviewed_commit: "9243a1a"
base_commit: "a8a3668"
branch: task/T0306-add-start-time-yearly-repeat-and-goal-sections
---
# Review Findings: Task T0306 (Round 1)

## Summary

**[Decided]** Reject pending correction of connected task start-time eligibility. The affected unit tests, lint, and 21 specified browser tests passed.

## Defects

- **Blocking:** `src/js/views/task-editor.js:1187` deliberately skips loading events for connected tasks. Consequently, `startEditable()` at line 1063 treats an open first occurrence with zero completions as event-free, even after a start or another user event. Starts remains editable instead of becoming text, contrary to the Time window specification. The local store may reject the edit, but that does not provide the required display and cannot establish whether server-side events exist.

## Process Gaps

- **Non-blocking:** The validation proof truncates test output without the required omission counts and omits the final summaries of the documented full-suite failures.

## Required Rework

- Determine connected occurrence eligibility from authoritative user-event history, render Starts as text when events exist, and cover this connected scenario with an automated regression test.
