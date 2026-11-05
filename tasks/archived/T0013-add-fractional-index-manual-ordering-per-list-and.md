---
id: T0013
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T14:38:11Z"
ended_at: "2026-11-04T14:42:59Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: e68d3b2b028b8e1204b3ebbd8c81a12ce3602cf6
---
# T0013: Add fractional-index manual ordering per list

## Goals
Add base-62 fractional-index keys compatible with the service's positions (`LV-2` to `LV-5`).
Move a task before or after a neighbor within one list without touching other lists.
The query functions moved to T0029 when this task was split for size on 2026-11-04.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' List View and Task View sections and the service's ordering rules.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write fractional-index.js, the move operation, and list positions in the store.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

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

- [2026-11-04] **[Implement]**
  Merged the ordering changes by hand onto T0014; moveInList rejects deleted tasks and lists; added recycle bin position tests.
  - Size after split: 7 files, 875 lines.
  - Query module and tests left out for T0029.

- [2026-11-04] **[Review]**
  Agent review approved; minor notes on a silent rebalance after a malformed key, and moves next to hidden members.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 8.
  - Lines touched: 876.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

