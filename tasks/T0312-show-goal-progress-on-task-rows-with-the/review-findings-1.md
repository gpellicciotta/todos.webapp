---
task: T0312
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T06:30:42Z
reviewed_commit: "30b48df"
base_commit: "3623737"
branch: task/T0312-show-goal-progress-on-task-rows-with-the
---
# Review Findings: Task T0312 (Round 1)

## Summary
**[Decided]** Reject: the quick log can submit duplicate entries while a request is pending.
The unit suite passed 2,137 tests, lint passed, and the affected browser suite passed 20 tests.

## Defects
- **Blocking:** `src/js/views/quick-log.js`, `post` and `onLog`: disabling the Log button does not prevent Enter in an input from calling `onLog` again. While the first `submit` promise is pending, repeated Enter presses post additional log events. The toast can undo only one entry, leaving unintended progress. The same race can occur after confirming a duration above 12 hours.

## Process Gaps
- None identified.

## Required Rework
- Guard all quick-log submission paths while a request is pending. Add a regression test with a deferred submission and repeated Enter, and verify only one log event is posted.
