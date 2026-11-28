---
id: T0304
owner: ~
needs: ['T0315']
branch: —
worktree: —
status: suspended
started_at: —
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
- [ ] **[Read]**      Read the sync sections of local-store.md, the todos.server REST API spec, and the sync modules.
- [ ] **[Implement]** Author failing queue, push, pull, merge, and contract tests for logs, undos, and entries.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Queue, push, and pull the new events and fields, and tolerate unknown event types.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
