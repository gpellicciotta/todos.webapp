---
task: T0314
round: 1
verdict: rejected
blocking: 2
reviewer: "@codex"
reviewed_at: 2026-11-28T01:44:42Z
reviewed_commit: "941bc96"
base_commit: "aa3f6b8"
branch: task/T0314-convert-local-completions-to-log-events-in-the
session: codex-20261128-5bdb63
session_agent: codex
session_created_at: 2026-11-28T01:43:32Z
---
# Review Findings: Task T0314 (Round 1)

## Summary
**[Decided]** Reject: backup export loses log data, and queue rollback leaves log caches inconsistent. `npm test` passed 1,892 tests; `npm run lint` passed.

## Defects
- **Blocking — Backup loses stored log data.** `src/js/core/backup.js:658` drops every unchecked log and strips time, amount, and label from checked logs through the format 2 field projection. An export followed by overwrite import cannot restore these entries, violating BAK-1 and BAK-14. The recorded format 2 decision does not resolve the loss. A human must decide whether to introduce a lossless backup format now or explicitly change the backup requirements and accept data loss.
- **Blocking — Rejected queued logs leave incorrect occurrence state.** `src/js/sync/queue.js:792` restores only the former count, status, and close time and removes an entry by its own ID. Rejecting a time-only log leaves its time total unchanged; rejecting an undo leaves its target missing from `entries`. `rechain` also uses the former event fold, which does not rebuild log totals and live entries. This leaves the cached occurrence inconsistent with the stored events after sync rejection.

## Process Gaps
- **Non-blocking —** The red-phase evidence in `validation-proof.md` summarizes failure output rather than preserving the required verbatim output and failure details.

## Required Rework
- Resolve the backup format decision and preserve log fields and undo relationships across export and import, with round-trip coverage.
- Rebuild the occurrence from surviving log events when rolling back queued log or undo events, including later queued events; cover time totals and live entries in regression tests.
