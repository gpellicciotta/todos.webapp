---
id: T0234
owner: "@claude"
session: claude-20261115-921768
needs: []
branch: task/T0234-show-event-actions-done-and-target-counts-and
worktree: .plan/work/T0234-show-event-actions-done-and-target-counts-and
status: active
started_at: "2026-11-15T09:49:17Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 4081.0, input: 628, output: 196048, cache_read: 66370416, cache_write: 603030}
  review: {turns: 2, duration_s: 1395.4, input: 540260, output: 62674, cache_read: 10926168}
review_status: pending
review_round: 2
review_requested_at: "2026-11-15T10:35:32Z"
review_session: antigravity-20261115-62b39c
work_duration: 2122.7
---
# T0234: Show event actions, done and target counts, and lifecycle rule editing in the web app task views

## Goals
Make the task row's status button tick: `complete` below target, `uncomplete` once completed, absorbing one-click completion.
Offer `start`, `unstart`, `cancel`, and `reopen` in a status menu on the row and in the editor when their preconditions hold.
Show `done/target` counts and edit target count, deadline, and overdue handling through the lifecycle rules.
Read filters, grouping, and sorting from `current-occurrence`, and sort by `last-update-time`.
Start after T0224 and todos.server T0241; follow the [T0215 design](../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the T0215 spec, ui-design.md, T0225, and the task row, editor, and view controls code.
- [x] **[Decided]**   The status button ticks, absorbing the one-click completion of T0225, decided on 2026-11-13.
- [x] **[Implement]** Author unit tests for ticking, the status menu, counts, rule editing, filters, and the last update sort.
- [x] **[Implement]** Author e2e tests that tick a target-3 task to 3/3 and edit its deadline in local mode.
- [x] **[Verify]**    Run the unit and e2e suites and capture the expected red-phase failures.
- [x] **[Implement]** Replace the status menu click with the tick button and add the event action menu.
- [x] **[Implement]** Show done and target counts and add target, deadline, and overdue handling editing.
- [x] **[Implement]** Move filters, grouping, Finished today only, and sorting onto the current occurrence and last update.
- [x] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [x] **[Visual]**    Capture before and after screenshots of the task row, status menu, and editor.
- [x] **[Doc]**       Update requirements, ui-design.md, and CHANGELOG.md.
- [x] **[Implement]** Address review round 1 findings: tick icon, x shortcut, stale docs, gallery, changelog, and screenshots.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Doc]**
  Wrote the task views part of the approved T0224 split.

- [2026-11-15] **[Verify]**
  Captured the red phase: 29 unit tests failed in task-list, task-editor, and view-controls, and 5 e2e tests failed.
  - Query tests already passed, since T0224 moved query onto the current occurrence.

- [2026-11-15] **[Implement]**
  Replaced status picking with the tick button and event menu, added counts and target editing, and moved deadline and overdue edits onto lifecycle rules.

- [2026-11-15] **[Verify]**
  Unit, lint, check:sw, contract against todos.server 9564bec, and e2e passed; fixed a T0228 e2e locator that matched the add live region.
  - Unit: 1317 passed; e2e: 208 passed; contract: 9 passed.

- [2026-11-15] **[Visual]**
  Captured before and after screenshots of rows, status menu, and editor, wide light and compact dark, with no console or network errors.
  - See validation-proof.md, Visual verification.

- [2026-11-15] **[Doc]**
  Updated TSK-4, LST-12, TV-14, and added TSK-15 in requirements; updated ui-design.md and CHANGELOG.md.

- [2026-11-15] **[Implement]**
  Size note: 17 counted files exceed the 13 declared, still under the large line; undeclared files are listed in technical-spec.md.
  - Files touched: 17.
  - Lines touched: 859.
  - Reopenings: 0.

- [2026-11-15] **[Read]**
  Read the T0215 spec, ui-design.md, the T0225 click behavior, and the row, editor, query, and view controls code; store postEvent and updateRules already existed.

- [2026-11-15] **[Implement]**
  Authored unit tests for ticking, the event menu, counts, editor actions, target and rule saves, current-occurrence queries, and the Last update label.

- [2026-11-15] **[Implement]**
  Authored an e2e test that ticks a target-3 task to 3/3 and edits its deadline in local mode, and moved status menu specs onto events.

- [2026-11-15] **[Implement]**
  Decided the tick reopens a cancelled task and the editor shows actions as buttons; recorded both in technical-spec.md.

- [2026-11-15] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-15] **[Review]**
  Round 1 rejected by @gemini: Core ticking, status menu actions, counts, and rule editing work well; unit, lint, service-worker, and 99 e2e tests pass.
  - Findings: [review-findings-1.md](T0234-show-event-actions-done-and-target-counts-and/review-findings-1.md).

- [2026-11-15] **[Size]**
  Size note: review rework crosses the large line at about 20 counted files, 900 lines; most are one-line doc and test fixes. Manager: proceed, no split.

- [2026-11-15] **[Implement]**
  Addressed review round 1: tick icon shows its resulting status, x shortcut text ticks, and docs, gallery, CSS comments, and changelog match.
  - Consolidated superseded T0225 changelog bullets into net bullets.

- [2026-11-15] **[Verify]**
  Rework passed npm test, lint, check:sw, pytest, the full e2e suite, and the gallery specs; gallery screenshots at 390 and 1440 px, light and dark.
  - Unit 1317, e2e 208, gallery 52, pytest 156 passed.

- [2026-11-15] **[Implement]**
  Size note: rework measures 20 counted files and 924 lines, above the large line of 18 files.
  - Files touched: 20.
  - Lines touched: 924.
  - Reopenings: 0.

- [2026-11-15] **[Review]**
  Round 2 requested (mode: agent).

