---
task: T0306
round: 2
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T04:14:45Z
reviewed_commit: "94d4ed3"
base_commit: "a8a3668"
branch: task/T0306-add-start-time-yearly-repeat-and-goal-sections
session: codex-20261128-2a0feb
session_agent: codex
session_created_at: 2026-11-28T04:13:53Z
---
# Review Findings: Task T0306 (Round 2)

## Summary

**[Decided]** Reject: connected start-time eligibility still misses locally queued user events. The affected unit suite passed 91 tests, and ESLint passed for the changed files.

## Defects

- **Blocking:** `src/js/views/task-editor.js:1207` selects server events exclusively whenever the request succeeds. A locally posted `start` event can remain queued while the server returns an empty history. The local occurrence can then be in progress with zero completions, so `startEditable()` still exposes Starts as an editable field. This violates the requirement to make Starts text after any user event. The regression test only adds the event to the server response and explicitly excludes local events.

## Process Gaps

None.

## Required Rework

- Combine authoritative server history with pending local user events when determining eligibility. Add a regression test where the server has no user events but a local start event is queued.
