---
task: T0311
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-28T02:47:01Z
reviewed_commit: "3f81faf"
base_commit: "ba646c5"
branch: task/T0311-add-a-help-screen-to-the-user-menu
---
# Review Findings: Task T0311 (Round 1)

## Summary

**[Decided]** Rejected: Help does not support the specified query links. The affected unit tests passed (130 tests), as did the Help end-to-end tests (8 tests).

## Defects

- **Blocking:** The specification requires `?q=` and `?topic=` links. `src/js/views/help.js:199` disables location reading, and `src/js/ui/router.js:75` treats a query in the hash as part of the route. Thus `#/help?q=shortcut` redirects to tasks, while a query before the hash is ignored. Search and topic controls cannot replace shareable filtered links.

## Process Gaps

- **Non-blocking:** The execution log records a unilateral decision to omit query parameters, despite the explicit technical specification.

## Required Rework

- Support Help query links for search and topic filters, including routing and initial filter state. Add automated coverage for direct links and navigation.
