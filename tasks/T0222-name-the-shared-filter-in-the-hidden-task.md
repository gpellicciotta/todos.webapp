---
id: T0222
owner: "@claude"
session: claude-20261117-ddbf42
needs: []
branch: task/T0222-name-the-shared-filter-in-the-hidden-task
worktree: .plan/work/T0222-name-the-shared-filter-in-the-hidden-task
status: active
started_at: "2026-11-17T03:49:10Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

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

