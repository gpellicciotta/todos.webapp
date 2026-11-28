---
id: T0303
owner: "@claude"
session: claude-20261128-9611c7
needs: []
branch: task/T0303-store-adr-0006-goals-start-times-logs-and
worktree: .plan/work/T0303-store-adr-0006-goals-start-times-logs-and
status: cancelled
started_at: "2026-11-28T00:18:53Z"
ended_at: "2026-11-28T00:58:28Z"
review: agent
preview: none
protocol: standard
size_status: requested
size_estimate: 25 files, 2500 lines
usage:
  worker: {turns: 1, duration_s: 110.8, input: 34, output: 6968, cache_read: 1352416, cache_write: 128097}
work_duration: 117.8
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

- [2026-11-28] **[Read]**
  Read local-store.md, store, occurrences, migrate, overdue code. Real scope far exceeds the 8-file, 450-line estimate; no code changed yet.
  - occurrences.js applyEvent and rule model still use target-count and completion-count.
  - queue, merge, backup, task-list, task-editor also read those fields.
  - 224 test references across 22 files use the old fields.

- [2026-11-28] **[Decide]**
  Size note: store records change shape, so consumers and about 200 test references must change together. Estimate 25 files, 2500 lines. Proposed split: core occurrences model, store upgrade and actions, consumer adaptation.

- [2026-11-28] **[Size]**
  Size approval requested for 25 files, 2500 lines.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 0.
  - Lines touched: 0.
  - Reopenings: 0.

- [2026-11-28] **[Cancelled]**
  Split into T0313, T0314, T0315, and T0316 to stay under the large size line.

