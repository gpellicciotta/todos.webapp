---
id: T0224
owner: "@claude"
session: claude-20261115-e8f1bb
needs: []
branch: task/T0224-adopt-task-entries-status-entries-recurring-tasks-and
worktree: .plan/work/T0224-adopt-task-entries-status-entries-recurring-tasks-and
status: active
started_at: "2026-11-15T08:04:34Z"
ended_at: —
review: agent
preview: none
protocol: standard
size_status: approved
size_estimate: 60 files, 2734 lines
usage:
  worker: {turns: 8, duration_s: 7054.0, input: 532, output: 164146, cache_read: 133336186, cache_write: 381874}
  review: {turns: 2, duration_s: 2025.2, input: 1031372, output: 101440, cache_read: 15292238}
work_duration: 4764.4
size_approved: 60 files, 2734 lines
size_approved_by: "@giova"
size_approved_at: "2026-11-15T07:58:09Z"
review_status: rejected
review_round: 1
review_requested_at: "2026-11-15T00:19:01Z"
reviewed_by: "@gemini"
review_session: antigravity-20261115-aad8d2
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
- [x] **[Implement]** Add occurrences and events stores with a version 5 migration and the event fold.
- [x] **[Implement]** Queue and push events, merge the new task shape, and rename note fields.
- [x] **[Implement]** Point status, due time, and activity readers in core, views, and backup at the new shape.
- [x] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [x] **[Doc]**       Update local-store.md, the affected requirements, and CHANGELOG.md.
- [x] **[Implement]** Fix review round 1 defects D1 to D5 and the changelog areas, proving each test fails first.
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

- [2026-11-15] **[Size]**
  Size note: mid-task diff measures 40 counted files, 1995 lines, above the approved 30 files, 1600 lines. Kept whole: the task shape change cannot merge in parts.

- [2026-11-15] **[Implement]**
  Added occurrences and events stores, the version 5 migration, event queueing and push, the event-folding merge, and occurrence readers in core, views, and backup.
  - Contract harness runs the server jar; T0207 note test is now it.

- [2026-11-15] **[Verify]**
  Ran lint, check:sw, npm test, the contract suite on a local todos.server clone, and the e2e suite; all passed.
  - Unit: 1221 passed.
  - Contract: 9 passed.
  - E2e: 201 passed.

- [2026-11-15] **[Size]**
  Size note: Measured 58 counted files and 2289 lines, above the approved 30 files and 1600 lines.
  - src/js 18 files, 962 lines; tests/unit 23 files, 981 lines.
  - Fixture updates for the new shape grew the test count.

- [2026-11-15] **[Verify]**
  Recorded task outcomes.
  - Files touched: 58.
  - Lines touched: 2289.
  - Reopenings: 0.

- [2026-11-15] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-15] **[Review]**
  Round 1 rejected by @gemini: The v5 store schema, occurrence event folding, status-to-event mapping, sync push/merge, and Java-backed contract harness are well structured.
  - Findings: [review-findings-1.md](T0224-adopt-task-entries-status-entries-recurring-tasks-and/review-findings-1.md).

- [2026-11-15] **[Implement]**
  Fixed round 1 findings: note ownership by user, rollback chains, migrated undo data, recurring rule invariants, disconnect events, and changelog areas.
  - 12 new tests failed with the fixes reverse-applied.

- [2026-11-15] **[Verify]**
  Reran lint, check:sw, npm test, the contract suite, and the e2e suite after the rework; all passed.
  - Unit: 1232 passed.
  - Contract: 9 passed.
  - E2e: 201 passed.

- [2026-11-15] **[Size]**
  Size note: Rework raised the measure to 58 counted files and 2594 lines; plan measures 60 files and 2734 lines with mechanical files.
  - Requesting renewed human size approval, per review finding P1.

- [2026-11-15] **[Verify]**
  Recorded task outcomes.
  - Files touched: 58.
  - Lines touched: 2594.
  - Reopenings: 0.

- [2026-11-15] **[Size]**
  Size approval requested for 60 files, 2734 lines.

- [2026-11-15] **[Size]**
  Size approved by @giova for 60 files, 2734 lines.

- [2026-11-15] **[Size]**
  Resumed after @giova approved the size for 60 files and 2734 lines; the round 1 rework at 9543de7 stays verified and unchanged.

