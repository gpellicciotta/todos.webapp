---
id: T0304
owner: "@claude"
session: claude-20261128-9a833f
needs: []
branch: task/T0304-sync-adr-0006-logs-undos-entries-and-statuses
worktree: .plan/work/T0304-sync-adr-0006-logs-undos-entries-and-statuses
status: active
started_at: "2026-11-28T04:34:48Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0304: Sync ADR-0006 logs, undos, entries, and statuses with the service, keeping queued legacy events replayable

## Goals
Sync ADR-0006 data with todos.server, per its REST API spec and local-store.md.
Queue and push `log` and `undo-log` events, and read `entries`, `progress`, `time-spent-seconds`, `failed`, and the new rule fields.
Keep `complete` and `uncomplete` changes queued before the upgrade replayable, through the service aliases.
List unknown event types without failing, and revert rejected undos as other rejected changes.
Run the contract tests against a todos.server checkout with its task T0301.

## Task Execution Steps
- [x] **[Read]**      Read the sync sections of local-store.md, the todos.server REST API spec, and the sync modules.
- [x] **[Implement]** Author failing queue, push, pull, merge, and contract tests for logs, undos, and entries.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [x] **[Implement]** Queue, push, and pull the new events and fields, and tolerate unknown event types.
- [x] **[Verify]**    Run the new and affected tests and confirm they pass.
- [x] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Read]**
  Read local-store.md, the REST API spec, and the sync modules; most log and undo queueing already existed.

- [2026-11-28] **[Implement]**
  Found that the service refuses target-count and returns goal-target and progress, so 16 contract tests failed.

- [2026-11-28] **[Implement]**
  Sent goal-target on the wire, read goal-target, progress, and entries on pull, and ignored unknown entry types.

- [2026-11-28] **[Doc]**
  Updated local-store.md and CHANGELOG.md. Size note: 11 counted files, about 340 lines, because wire fixes needed tests.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 11.
  - Lines touched: 340.
  - Reopenings: 0.

