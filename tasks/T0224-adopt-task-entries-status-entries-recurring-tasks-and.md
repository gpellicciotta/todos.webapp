---
id: T0224
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0224: Adopt lifecycle rules, occurrences, events, and recurring tasks from the todos.server redesign of tasks T0215 to T0241

## Goals
Adopt the todos.server task redesign: embedded `lifecycle-rules` and `current-occurrence`, posted events, target counts, and recurrence.
Replace status edits with `complete`, `uncomplete`, `start`, `unstart`, `cancel`, and `reopen` events, queued offline.
Show `done/target` counts, edit target, deadline, and recurrence, and offer grace completions and an online history view.
Run the same rules locally, including period math and roll-over, because local mode has no server (`LOC-2`).
Move backups, sorting, and notes to the new fields and the single `last-update-time`.
Start only after todos.server T0241 and T0221 are released; follow its [T0215 design](../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md).
The scope exceeds the large line; split it as the companion spec proposes before starting.

## Task Execution Steps
- [ ] **[Read]**      Read the todos.server T0215 spec, docs/specs, and the store, sync, and task view code.
- [ ] **[Decide]**    Confirm the split into four tasks and the status button behavior with the user.
- [ ] **[Implement]** Author unit tests for periods, occurrence folding, roll-over, event queueing, merge, and backup v2.
- [ ] **[Implement]** Author e2e tests for ticking, counts, rule editing, recurrence, grace completion, and history.
- [ ] **[Verify]**    Run the unit and e2e suites and capture the expected red-phase failures.
- [ ] **[Implement]** Add local periods, occurrences, and events to the store with a version 5 migration.
- [ ] **[Implement]** Queue and push events, apply them to cached occurrences, and merge the new task shape.
- [ ] **[Implement]** Replace status edits with event actions, counts, and rule editing in the task views.
- [ ] **[Implement]** Add recurrence editing, the display rule, grace completions, history, and backup format 2.
- [ ] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [ ] **[Visual]**    Capture before and after screenshots of the task row, editor, and history view.
- [ ] **[Doc]**       Update requirements, local-store, backup-format, and ui-design specs, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Doc]**
  Rescoped to the 2026-11-13 todos.server T0215 design of lifecycle rules, occurrences, and events.
