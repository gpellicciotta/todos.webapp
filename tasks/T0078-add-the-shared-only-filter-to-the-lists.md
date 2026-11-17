---
id: T0078
owner: "@claude"
session: claude-20261117-0ff5fa
needs: []
branch: task/T0078-add-the-shared-only-filter-to-the-lists
worktree: .plan/work/T0078-add-the-shared-only-filter-to-the-lists
status: active
started_at: "2026-11-17T05:45:10Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 234.7, input: 58, output: 22102, cache_read: 2706761, cache_write: 94864}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T05:49:13Z"
---
# T0078: Add the Shared only filter to the Lists screen sort menu while connected

## Goals
Add a Shared only checkbox to the Lists screen sort menu while connected and at least one list is shared.
Name it on the info line, persist it in `todos.view.lists`, and lock reordering while it is on (`LST-16`).
Follow ui-design.md, Many Lists: sort.

## Task Execution Steps
- [x] **[Implement]** Author unit and e2e tests for the checkbox, the filter, the info line, and the reorder lock.
- [x] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [x] **[Implement]** Add the Shared only item to the sort menu and filter lists by sharing state with the SHR-3 data.
- [x] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [x] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Verify]**
  New unit tests fail before the code: 4 of 30 in lists.test.js.

- [2026-11-17] **[Verify]**
  Unit, npm test, lint, and e2e pass.
  - Files touched: 5.
  - Lines touched: 255.
  - Reopenings: 0.

- [2026-11-17] **[Implement]**
  Wrote unit and e2e tests for the checkbox, filter, info line, and reorder lock.

- [2026-11-17] **[Implement]**
  Added the Shared only menu item, SHR-3 filter, stored shared key, and reorder lock.

- [2026-11-17] **[Doc]**
  Updated ui-design.md, the changelog, and the lists module comments.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

