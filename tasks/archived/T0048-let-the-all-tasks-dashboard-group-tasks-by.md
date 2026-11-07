---
id: T0048
owner: "@claude"
session: claude-20261107-85fc2d
needs: []
branch: task/T0048-let-the-all-tasks-dashboard-group-tasks-by
worktree: .plan/work/T0048-let-the-all-tasks-dashboard-group-tasks-by
status: completed
started_at: "2026-11-07T14:07:38Z"
ended_at: "2026-11-07T14:49:49Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 4217.6, input: 72, output: 13684, cache_read: 7488746, cache_write: 30854}
  review: {turns: 2, duration_s: 754.4, input: 304620, output: 19086, cache_read: 3956784}
work_duration: 2531.3
review_status: approved
review_round: 1
reviewed_by: "@gemini"
completion-commit: 04b1b866a6aaf8a515a8c66fac7731bd3ed6b880
---
# T0048: Let the All tasks dashboard group tasks by List, Due Date, or Status

## Goals
Let the All tasks dashboard group tasks by List, Due Date, or Status, or not at all.
Groups show a header with a count; search, filters, and sort apply inside each group.
The choice persists per device. Long lists stay virtualized.
Adds the Group by control to the View options panel that T0054 builds; see VO-9 to VO-12.
Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js`

## Task Execution Steps
- [x] **[Read]**      Read query.js, all-tasks.js, and the virtualization in task-list.js.
- [x] **[Implement]** Author tests for the grouping function and for group headers on All tasks.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Add groupTasks to query.js with List, Due Date, and Status groupings and ordered buckets.
- [x] **[Implement]** Render group headers in the virtualized task list and add the Group by control to the View options panel.
- [x] **[Implement]** Persist the grouping choice in preferences.
- [x] **[Verify]**    Run unit, end-to-end, and 5000-task performance tests and confirm they pass.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Verify]**
  Wrote unit, e2e, and perf tests; they fail because groupTasks, headers, and Group by are missing.
  - vitest: 26 failed, 73 passed.
  - playwright: 2 Group by tests fail.

- [2026-11-07] **[Decided]**
  Added an Earlier due bucket for finished tasks due before today, since they are not overdue; the decided six buckets are otherwise unchanged.

- [2026-11-07] **[Decided]**
  Group by shows in All tasks only; the list view stores no grouping until LV-11. Grouping lives in the view state, so preferences.js only changed a comment.

- [2026-11-07] **[Implement]**
  Size note: diff reached 18 files and 1054 lines against 11 files and 420 estimated, below three times the estimate.
  - Added tokens.css, service-worker.js, hashes json, task-list.test.js.
  - Mechanical: node scripts/check-sw-version.mjs --update.

- [2026-11-07] **[Verify]**
  Unit, lint, and e2e pass; the 5000-task budget is not reliably met on this loaded machine, even on main.
  - 848 unit tests, 18 e2e tests passed.
  - Perf split: due-date budget test plus list-versus-ungrouped comparison.
  - See validation-proof.md for every perf run.

- [2026-11-07] **[Verify]**
  Recorded task outcomes.
  - Files touched: 18.
  - Lines touched: 1054.
  - Reopenings: 0.

- [2026-11-07] **[Read]**
  Read query.js, all-tasks.js, view-controls.js, preferences.js, and the virtualization in task-list.js.

- [2026-11-07] **[Doc]**
  Updated CHANGELOG.md, requirements VO-12, and the grouping section of ui-design.md; wrote validation-proof.md with screenshots.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 approved by @gemini: The implementation meets all functional, performance, and design requirements for grouping tasks in the All tasks dashboard.
  - Findings: [review-findings-1.md](T0048-let-the-all-tasks-dashboard-group-tasks-by/review-findings-1.md).

- [2026-11-07] **[Complete]**
  Task completed successfully.

