---
id: T0314
owner: "@claude"
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
- [ ] **[Read]**      Read Log, Fold, Store Upgrade, and Sync Queue in local-store.md and the store modules.
- [ ] **[Implement]** Author failing tests for the conversion, its aborts, log, undo, and queued changes.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Convert events and statuses, and add the log and undo actions.
- [ ] **[Verify]**    Run `npm test` and lint and confirm they pass.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Task split out of T0303, which asked for size approval at 25 files and 2500 lines.
