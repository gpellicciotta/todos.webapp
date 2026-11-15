---
task: T0237
round: 2
verdict: approved
reviewer: "@gemini"
reviewed_at: 2026-11-15T13:34:00Z
reviewed_commit: "f48c929"
base_commit: "4141dfc"
branch: task/T0237-show-task-notes-on-their-occurrence-and-let
---
# Review Findings: Task T0237 (Round 2)

## Summary
Approved on `f48c929`: all round-1 defects and process gaps are resolved, and unit, contract, Playwright, and lint checks pass.
- [store/notes.js](../../../src/js/store/notes.js) matches server `defaultLink`, and [push.js](../../../src/js/sync/push.js) sends `edit-times` on note edits.
- [views/notes.js](../../../src/js/views/notes.js) keeps past notes editable and populates `Belongs to` with occurrences `1` through `current`.
- [task-history.js](../../../src/js/views/task-history.js) updates shown occurrence notes live without re-fetching events or occurrences.

## Defects
None.

## Process Gaps
None.

## Required Rework
None.
