---
id: T0314
owner: "@claude"
session: claude-20261128-5de69e
needs: []
branch: task/T0314-convert-local-completions-to-log-events-in-the
worktree: .plan/work/T0314-convert-local-completions-to-log-events-in-the
status: active
started_at: "2026-11-28T01:27:30Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 1460.6, input: 216, output: 133865, cache_read: 23338774, cache_write: 302794}
  review: {turns: 3, duration_s: 193.5, input: 81938, output: 5463, cache_read: 867456, cache_write: 0}
review_status: pending
review_round: 4
review_requested_at: "2026-11-28T01:59:59Z"
review_session: codex-20261128-3ca49b
work_duration: 1619.7
---
# T0314: Convert local completions to log events in the upgrade, and store logs and undos

## Goals
Finish the event part of the version 6 upgrade, per Store Upgrade in docs/specs/local-store.md.
Convert `complete` and applied `uncomplete` events to `log` and `undo-log`, with the in-place fold check.
Convert closed statuses and queued legacy changes as the spec says.
Add store actions that log and undo entries; `complete` and `uncomplete` callers write the new events.
Keep the mirrors of T0313, and adapt the sync queue and merge only as far as their tests require.
Rules, files, and tests: [technical-spec.md](T0314-convert-local-completions-to-log-events-in-the/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read Log, Fold, Store Upgrade, and Sync Queue in local-store.md and the store modules.
- [x] **[Implement]** Author failing tests for the conversion, its aborts, log, undo, and queued changes.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Convert events and statuses, and add the log and undo actions.
- [x] **[Verify]**    Run `npm test` and lint and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Task split out of T0303, which asked for size approval at 25 files and 2500 lines.

- [2026-11-28] **[Decided]**
  Backup export writes log events as format 2 complete and uncomplete; imports keep them until backup format 3.

- [2026-11-28] **[Decided]**
  Upgrade skips occurrences without events, and leaves rules overdue-handling unchanged; only queued update-rules convert cancel to fail.

- [2026-11-28] **[Implement]**
  Added undeclared files: backup.js, adopt.js, local-store.md, and adopt, backup, pull, push tests, for log fields and event types.

- [2026-11-28] **[Verify]**
  Size note: 19 counted files and about 1135 lines exceed the large line, because logs touch store, queue, adopt, backup, and their tests.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 19.
  - Lines touched: 1135.
  - Reopenings: 0.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: [Decided]** Reject: backup export loses log data, and queue rollback leaves log caches inconsistent.
  - Findings: [review-findings-1.md](T0314-convert-local-completions-to-log-events-in-the/review-findings-1.md).

- [2026-11-28] **[Decided]**
  Backup keeps format 2 but carries log and undo-log events with all fields, so export and import lose nothing.

- [2026-11-28] **[Implement]**
  Rejected queued events now refold from surviving stored events; upgrade-converted entries without stored events keep the old restore.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 2 rejected by @codex: [Decided]** Reject: mixed legacy and log histories still rebuild incorrect caches.
  - Findings: [review-findings-2.md](T0314-convert-local-completions-to-log-events-in-the/review-findings-2.md).

- [2026-11-28] **[Implement]**
  foldLogCache now converts legacy complete and uncomplete to log form before folding, so mixed histories rebuild time, entries, and undos.

- [2026-11-28] **[Review]**
  Round 3 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 3 rejected by @codex: [Decided]** Reject: mixed histories can undo the wrong check.
  - Findings: [review-findings-3.md](T0314-convert-local-completions-to-log-events-in-the/review-findings-3.md).

- [2026-11-28] **[Suspended]**
  Suspended after 3 consecutive review rejections (blocking: 2, 1, 1). Inspect review findings before lifecycle resume.

- [2026-11-28] **[Decided]**
  Resumed by the loop manager after three rejections: convert mixed histories with one shared conversion that tracks every live check, checked logs and undo-logs included.
  - Reuse the upgrade conversion instead of a second legacy pass.
  - Test uncomplete after a checked log, and after an undo-log.
  - Record verbatim failing-first output in the validation proof.

- [2026-11-28] **[Implement]**
  Legacy uncomplete conversion now tracks checked logs and undo-logs as live checks, so it undoes the latest live check.

- [2026-11-28] **[Review]**
  Round 4 requested (mode: agent).

