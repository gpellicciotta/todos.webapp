---
task: T0307
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T05:35:34Z
reviewed_commit: "b252362"
base_commit: "0bd7088"
branch: task/T0307-show-progress-and-over-limit-marks-a-log
session: codex-20261128-d2ab6d
session_agent: codex
session_created_at: 2026-11-28T05:34:03Z
---
# Review Findings: Task T0307 (Round 1)

## Summary
**[Decided]** Reject: a cancelled task still offers a check action during the previous-period grace window.
The specified unit and end-to-end tests, ESLint, and service-worker check passed.

## Defects
- **Blocking:** `src/js/views/task-editor.js:1334` shows the previous-period button whenever grace applies to a checks goal, including cancelled tasks. Its handler posts a checked log. The Status tab specification requires checks disabled while cancelled. Disable or hide this action for cancelled tasks, and cover cancellation during the grace window.

## Process Gaps
None.

## Required Rework
- Prevent previous-period check-off while the task is cancelled, and verify the grace-window case with an automated test.