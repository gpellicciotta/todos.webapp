---
id: T0029
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T14:43:24Z"
ended_at: "2026-11-04T14:47:39Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 6525d7d47313b0af484ff8148c7881a84beb3f60
---
# T0029: Add the task query functions for the filters, search, and sorting of All tasks and the list view

## Goals
Add pure query functions for the filters, search, and sorts of All tasks and the list view (`TV-2` to `TV-10`, `LV-6`).
Split from T0013 on 2026-11-04 to keep both tasks below the large size line.
The code exists on branch wip/T0013-ordering; it is reviewed and integrated here.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Task View section and the parked query module on wip/T0013-ordering.
- [x] **[Implement]** Take over the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the tests without query.js, confirm they fail, and record the output in validation-proof.md.
- [x] **[Implement]** Take over query.js from the parked branch on top of the integrated T0013 ordering.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Describe the query module in docs/specs/local-store.md and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Read]**
  Re-read the Task View requirements and the parked query module and tests on wip/T0013-ordering.

- [2026-11-04] **[Verify]**
  Red phase: taken-over tests fail without query.js, and two new adaptation tests fail with the parked query.js.
  - New tests: due boundaries, multi-note search, store-backed queries.

- [2026-11-04] **[Implement]**
  Took over query.js; indexMemberships now skips memberships of non-live lists, and the overdue filter reuses isOverdue.
  - Size: 3 files, 735 lines; query.js 343, tests 365, docs 27.

- [2026-11-04] **[Verify]**
  Query tests, store tests, and eslint pass; proof recorded in validation-proof.md.
  - query.test.js: 33 passed; store and lib: 157 passed.
  - Filter and sort of 5000 tasks: 8.4 ms.
  - npm test: 326 passed; npm run lint clean.

- [2026-11-04] **[Review]**
  Agent review approved; minor notes on impossible date bounds, non-array filter values, and a timing check on slow runners.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 4.
  - Lines touched: 736.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

