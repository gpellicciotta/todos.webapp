---
id: T0303
owner: "@claude"
needs: []
branch: task/T0303-store-adr-0006-goals-start-times-logs-and
worktree: .plan/work/T0303-store-adr-0006-goals-start-times-logs-and
status: active
started_at: "2026-11-28T00:18:53Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0303: Store ADR-0006 goals, start times, logs, and undos locally, migrating the database and local legacy events

## Goals
Store ADR-0006 data locally, per local-store.md after T0299.
Upgrade the IndexedDB database: goal fields and `start-time` on rules, `progress` and `time-spent-seconds` on occurrences, and the new event fields.
Convert local `complete` and `uncomplete` events and closed statuses as the todos.server migration does, with the in-place fold check.
Add store actions to log and undo entries, place events by `start-time`, and apply the expiry rules by goal.
Filter on `failed`, and compute the `upcoming` flag.
Cover `failed` in the finished-today filter, and persist the Show upcoming view option (`TV-14`, `TV-15`).

## Task Execution Steps
- [ ] **[Read]**      Read local-store.md, the store modules, and the database upgrade code.
- [ ] **[Implement]** Author failing store tests for the upgrade, conversion, log, undo, expiry, and start times.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Upgrade the database, convert legacy events, and add the store actions and rules.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
