---
id: T0221
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
# T0221: Prune Lists filter ids of deleted lists before the All tasks hidden-task toast, which now reads 'Task added. hides it.'

## Goals
Fix the hidden-task toast after an add in All tasks when the stored Lists filter names only deleted lists.
`render` in `src/js/views/all-tasks.js` prunes those ids, but `notifyIfHidden` in `add-bar.js` gets the unpruned filter.
`hidingFilters` then reports `lists`, `describeFilters` names nothing, and the toast reads "Task added. hides it."
Compute the effective filter once and pass it to both the rows and `notifyIfHidden`.
A filter of deleted lists then hides nothing, so no toast shows.
Rules and tests: [technical-spec.md](T0221-prune-lists-filter-ids-of-deleted-lists-before/technical-spec.md).

## Task Execution Steps
- [ ] **[Implement]** Author the failing unit and e2e tests for a Lists filter of deleted lists.
- [ ] **[Verify]**    Run the new tests and confirm they fail with the empty-named toast.
- [ ] **[Implement]** Share the pruned filter between the rendering and the hidden-task toast.
- [ ] **[Verify]**    Run `npm test`, `npm run lint`, and the All tasks e2e spec; record the passing output.
- [ ] **[Doc]**       Add a CHANGELOG.md entry.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Confirmed the bug still exists in add-bar.js and all-tasks.js; wrote goals, tests, and steps.
