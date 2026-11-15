---
id: T0224
owner: "@claude"
session: claude-20261115-e8f1bb
needs: []
branch: task/T0224-adopt-task-entries-status-entries-recurring-tasks-and
worktree: .plan/work/T0224-adopt-task-entries-status-entries-recurring-tasks-and
status: active
started_at: "2026-11-14T23:31:33Z"
ended_at: —
review: agent
preview: none
protocol: standard
size_status: approved
size_estimate: 30 files, 1600 lines
usage:
  worker: {turns: 2, duration_s: 115.6, input: 36, output: 4652, cache_read: 734980, cache_write: 86730}
work_duration: 87.4
size_approved: 30 files, 1600 lines
size_approved_by: "@giova"
size_approved_at: "2026-11-14T23:30:40Z"
---
# T0224: Adopt the todos.server lifecycle rules, occurrences, and events in the web app store and sync

## Goals
Move the store and sync to the todos.server task shape with embedded `lifecycle-rules` and `current-occurrence`.
Add local occurrences and events, folded by the server rules, so local mode keeps every feature (`LOC-2`).
Queue and push `complete`, `uncomplete`, `start`, `unstart`, `cancel`, and `reopen` events; map status edits onto them.
Keep views and backups working on the new shape, rename note fields, and use the single `last-update-time`.
Start after todos.server T0241 is released; follow its [T0215 design](../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md).
T0234 (task views), T0235 (recurrence), and T0236 (backup format 2) build on this task.

## Task Execution Steps
- [x] **[Read]**      Read the todos.server T0215 spec, local-store.md, and the store, sync, and status reader code.
- [x] **[Decided]**   The user approved splitting the redesign into T0224, T0234, T0235, and T0236 on 2026-11-13.
- [x] **[Implement]** Author unit tests for the version 5 migration, occurrence folding, event queueing, push, and merge.
- [x] **[Implement]** Extend the contract suite to tick a target-3 task through events against a local server.
- [x] **[Verify]**    Run the unit and contract suites and capture the expected red-phase failures.
- [ ] **[Implement]** Add occurrences and events stores with a version 5 migration and the event fold.
- [ ] **[Implement]** Queue and push events, merge the new task shape, and rename note fields.
- [ ] **[Implement]** Point status, due time, and activity readers in core, views, and backup at the new shape.
- [ ] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [ ] **[Doc]**       Update local-store.md, the affected requirements, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Doc]**
  Rescoped to the 2026-11-13 todos.server T0215 design of lifecycle rules, occurrences, and events.

- [2026-11-13] **[Doc]**
  Narrowed to the store and sync part after the user approved the split into T0224, T0234, T0235, and T0236.

- [2026-11-15] **[Size]**
  Size approval requested for 30 files, 1600 lines.

- [2026-11-15] **[Review]**
  Suspended before coding: the 30-file, 1600-line estimate exceeds the large line and lacks human size approval.
  - Requested approval: 30 files, 1600 lines.
  - todos.server T0241 completed but unreleased; v3.4.0-pre has no release.
  - Open question: may work start before the v3.4.0 server release?.

- [2026-11-15] **[Size]**
  Size approved by @giova for 30 files, 1600 lines.

- [2026-11-15] **[Decided]**
  Manager decision: build and test against todos.server main with a local server; do not wait for the v3.4.0 release.

- [2026-11-15] **[Decided]**
  Started against todos.server main after size approval; T0241 is merged there, and the contract suite runs a local server.

- [2026-11-15] **[Verify]**
  Captured the red phase: 41 unit failures and 4 contract failures, all for the missing task shape, events, and store methods.
  - Contract harness now runs the server jar; devops.py lost --port.

