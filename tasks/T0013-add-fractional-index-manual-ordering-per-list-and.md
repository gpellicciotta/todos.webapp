---
id: T0013
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: suspended
started_at: "2026-11-04T01:23:51Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0013: Add fractional-index manual ordering per list, and the task query functions for filters and sorting

## Goals
Add base-62 fractional-index keys compatible with the service's positions (`LV-2` to `LV-5`).
Move a task before or after a neighbor within one list without touching other lists.
Add query functions for the filters and sorts of All tasks and the list view (`TV-2` to `TV-10`, `LV-6`).
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' List View and Task View sections and the service's ordering rules.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write fractional-index.js, the move operation, and the query and sort functions.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Read]**
  Read LV and TV requirements, ui-design filters and sorts, and the service FractionalIndex and MembershipPlacement code.
  - Keys mirror the service Java port of rocicorp fractional-indexing.

- [2026-11-04] **[Verify]**
  Red phase: new fractional-index, query, and manual-order store tests fail as expected.
  - 2 suites fail on missing modules.
  - 15 store tests fail: moveInList and listMemberships missing.

- [2026-11-04] **[Implement]**
  Added fractional-index.js, query.js, membership positions with rebalance, moveInList, listMemberships, and the schema v3 position backfill.
  - Undeclared: db.js, store-tasks.test.js, store-notes.test.js, local-store.md.
  - Decided: schema v3 upgrade assigns positions in added-time order.

- [2026-11-04] **[Verify]**
  Green phase and completion check passed; proof recorded in validation-proof.md.
  - npm test: 242 passed; store and lib tests: 149 passed.
  - Filter and sort of 5000 tasks: 8.1 ms.
  - npm run lint and eslint src/js tests/unit: clean.

- [2026-11-04] **[Verify]**
  Size note: diff is 9 files and 1469 lines, above the large line and three times the estimate; human sign-off needed.
  - Tests account for 610 lines; fractional-index.js mirrors the service port.

- [2026-11-04] **[Doc]**
  Parked the finished work on branch wip/T0013-ordering and suspended the task for a human size sign-off.
  - Diff: 9 files, 1469 lines; estimate 450 lines.

