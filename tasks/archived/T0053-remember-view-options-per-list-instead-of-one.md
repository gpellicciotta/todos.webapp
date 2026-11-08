---
id: T0053
owner: "@claude"
session: claude-20261107-bfe356
needs: []
branch: task/T0053-remember-view-options-per-list-instead-of-one
worktree: .plan/work/T0053-remember-view-options-per-list-instead-of-one
status: completed
started_at: "2026-11-07T21:40:55Z"
ended_at: "2026-11-07T21:47:57Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 417.8, input: 124, output: 29474, cache_read: 4433380, cache_write: 153832}
  review: {turns: 2, duration_s: 391.2, input: 191944, output: 11026, cache_read: 1674566}
review_status: approved
review_round: 1
reviewed_by: "@gemini"
work_duration: 421.7
completion-commit: 18578380c33fe44774fbe5eee1b67e7aa7405a35
---
# T0053: Remember view options per list instead of one shared setting, with a reset to the shared defaults

## Goals
Remember view options per list instead of one shared setting, with a reset to the shared defaults.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0053.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Verify]**    Prove the new per-list tests fail before the implementation.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Implement]**
  Added per-list view options: select(listId) on the list model, one entry per list, Reset removes it.
  - Decided: old shared list entry no longer read.

- [2026-11-07] **[Verify]**
  Tests failed first (8 failed), then 1077 unit tests, lint, check:sw, and list e2e passed.
  - Files touched: 11.
  - Lines touched: 260.
  - Reopenings: 0.

- [2026-11-07] **[Doc]**
  Updated ui-design.md, requirements TV-12, and the CHANGELOG for per-list view options.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 approved by @gemini: Approved.
  - Findings: [review-findings-1.md](T0053-remember-view-options-per-list-instead-of-one/review-findings-1.md).

- [2026-11-07] **[Complete]**
  Task completed successfully.

