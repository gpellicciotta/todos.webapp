---
id: T0221
owner: "@claude"
session: claude-20261117-a145d4
needs: []
branch: task/T0221-prune-lists-filter-ids-of-deleted-lists-before
worktree: .plan/work/T0221-prune-lists-filter-ids-of-deleted-lists-before
status: completed
started_at: "2026-11-17T03:42:55Z"
ended_at: "2026-11-17T03:48:50Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 263.7, input: 52, output: 11171, cache_read: 1680781, cache_write: 47181}
  review: {turns: 1, duration_s: 81.9, input: 30769, output: 1700, cache_read: 308224, cache_write: 0}
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T03:47:26Z"
reviewed_by: "@codex"
review_session: codex-20261117-4c7545
work_duration: 355.3
completion-commit: 9f29a98f9a93eadc189afcad4f04aa5e165301d7
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
- [x] **[Implement]** Author the failing unit and e2e tests for a Lists filter of deleted lists.
- [x] **[Verify]**    Run the new tests and confirm they fail with the empty-named toast.
- [x] **[Implement]** Share the pruned filter between the rendering and the hidden-task toast.
- [x] **[Verify]**    Run `npm test`, `npm run lint`, and the All tasks e2e spec; record the passing output.
- [x] **[Doc]**       Add a CHANGELOG.md entry.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Confirmed the bug still exists in add-bar.js and all-tasks.js; wrote goals, tests, and steps.

- [2026-11-17] **[Verify]**
  Shared effectiveFilter() between render and the hidden-task toast; tests and proof recorded in validation-proof.md.

- [2026-11-17] **[Implement]**
  Added a unit test in all-tasks.test.js and an e2e test in all-tasks.spec.js for a Lists filter of a deleted list.

- [2026-11-17] **[Implement]**
  Added effectiveFilter() in all-tasks.js, used by render and by notifyIfHidden in add().

- [2026-11-17] **[Doc]**
  Added the CHANGELOG.md entry under v0.5.1-pre.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @codex: Approved.
  - Findings: [review-findings-1.md](T0221-prune-lists-filter-ids-of-deleted-lists-before/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

