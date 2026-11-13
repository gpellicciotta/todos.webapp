---
id: T0234
owner: ~
needs: [T0224]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0234: Show event actions, done and target counts, and lifecycle rule editing in the web app task views

## Goals
Make the task row's status button tick: `complete` below target, `uncomplete` once completed, absorbing one-click completion.
Offer `start`, `unstart`, `cancel`, and `reopen` in a status menu on the row and in the editor when their preconditions hold.
Show `done/target` counts and edit target count, deadline, and overdue handling through the lifecycle rules.
Read filters, grouping, and sorting from `current-occurrence`, and sort by `last-update-time`.
Start after T0224 and todos.server T0241; follow the [T0215 design](../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the T0215 spec, ui-design.md, T0225, and the task row, editor, and view controls code.
- [x] **[Decided]**   The status button ticks, absorbing the one-click completion of T0225, decided on 2026-11-13.
- [ ] **[Implement]** Author unit tests for ticking, the status menu, counts, rule editing, filters, and the last update sort.
- [ ] **[Implement]** Author e2e tests that tick a target-3 task to 3/3 and edit its deadline in local mode.
- [ ] **[Verify]**    Run the unit and e2e suites and capture the expected red-phase failures.
- [ ] **[Implement]** Replace the status menu click with the tick button and add the event action menu.
- [ ] **[Implement]** Show done and target counts and add target, deadline, and overdue handling editing.
- [ ] **[Implement]** Move filters, grouping, Finished today only, and sorting onto the current occurrence and last update.
- [ ] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [ ] **[Visual]**    Capture before and after screenshots of the task row, status menu, and editor.
- [ ] **[Doc]**       Update requirements, ui-design.md, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Doc]**
  Wrote the task views part of the approved T0224 split.
