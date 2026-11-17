---
id: T0222
owner: "@claude"
session: claude-20261117-ddbf42
needs: []
branch: task/T0222-name-the-shared-filter-in-the-hidden-task
worktree: .plan/work/T0222-name-the-shared-filter-in-the-hidden-task
status: completed
started_at: "2026-11-17T03:49:10Z"
ended_at: "2026-11-17T03:53:34Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 191.5, input: 56, output: 12287, cache_read: 2237734, cache_write: 70668}
  review: {turns: 1, duration_s: 62.5, input: 30997, output: 1449, cache_read: 267392, cache_write: 0}
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T03:52:30Z"
reviewed_by: "@codex"
review_session: codex-20261117-98b2cc
work_duration: 263.9
completion-commit: bdd5df631330ab9294b9ed2f56f6c92aa55182f5
---
# T0222: Name the Shared filter in the hidden-task toast and let Show clear it

## Goals
Make the hidden-task toast account for the Shared filter while connected.
`HIDING_FILTERS` in `src/js/core/query.js` leaves out `shared`, and `notifyIfHidden` passes no `sharedListIds`.
So a task added under Shared: yes hides silently, or the toast names only the other filters.
Add `shared` to the hiding filters, pass the shared list ids, and let Show clear it through `clearFilters`.
In local mode the Shared filter stays inactive, as in rendering.
Rules and tests: [technical-spec.md](T0222-name-the-shared-filter-in-the-hidden-task/technical-spec.md).

## Task Execution Steps
- [x] **[Implement]** Author the failing unit tests and the connected e2e case.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Count `shared` as a hiding filter and pass the shared list ids to the toast.
- [x] **[Verify]**    Run `npm test`, `npm run lint`, and the affected e2e specs; record the passing output.
- [x] **[Doc]**       Update the Search and Add section of ui-design.md and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Confirmed the gap in query.js and add-bar.js; wrote goals, tests, and steps, after T0221 shares the filter.

- [2026-11-17] **[Implement]**
  Added shared to hiding filters and passed shared list ids from All tasks; list view has no Shared filter, so list.js is unchanged.

- [2026-11-17] **[Verify]**
  Failing tests proven, then npm test, lint, and sharing e2e passed; output in validation-proof.md.

- [2026-11-17] **[Doc]**
  Updated ui-design.md Search and Add section and CHANGELOG.md.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 8.
  - Lines touched: 90.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @codex: [Decided]** Approved.
  - Findings: [review-findings-1.md](T0222-name-the-shared-filter-in-the-hidden-task/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

