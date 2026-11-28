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

