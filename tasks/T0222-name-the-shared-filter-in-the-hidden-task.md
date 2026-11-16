---
id: T0222
owner: ~
needs: ['T0221']
branch: —
worktree: —
status: ready
started_at: —
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
- [ ] **[Implement]** Author the failing unit tests and the connected e2e case.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Count `shared` as a hiding filter and pass the shared list ids to the toast.
- [ ] **[Verify]**    Run `npm test`, `npm run lint`, and the affected e2e specs; record the passing output.
- [ ] **[Doc]**       Update the Search and Add section of ui-design.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Confirmed the gap in query.js and add-bar.js; wrote goals, tests, and steps, after T0221 shares the filter.
