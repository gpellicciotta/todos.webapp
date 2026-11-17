---
id: T0272
owner: "@claude"
session: claude-20261117-f8873c
needs: []
branch: task/T0272-fix-all-tasks-opening-over-200-ms-with
worktree: .plan/work/T0272-fix-all-tasks-opening-over-200-ms-with
status: completed
started_at: "2026-11-17T06:29:48Z"
ended_at: "2026-11-17T06:44:33Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 638.0, input: 62, output: 17446, cache_read: 2974759, cache_write: 95706}
  review: {turns: 1, duration_s: 237.6, input: 50336, output: 3469, cache_read: 1158528, cache_write: 0}
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T06:40:33Z"
reviewed_by: "@codex"
review_session: codex-20261117-f7c605
work_duration: 885.9
completion-commit: d517663618898fc9da7b7747e1e1f7ba471a6522
---
# T0272: Fix All tasks opening over 200 ms with 5000 tasks under 4x CPU throttling, failing since before T0269

## Goals
Fix All tasks opening over 200 ms with 5000 tasks under 4x CPU throttling, failing since before T0269.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0272.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Implement]**
  Read four stores and shared one cached read between openings; open median fell from 289 to 116 ms.

- [2026-11-17] **[Verify]**
  Perf, unit, lint, sw checks pass; behaviors.spec:109 gallery test fails, untested on base.

- [2026-11-17] **[Doc]**
  Added changelog bullet and bumped service worker VERSION.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @codex: Approved.
  - Findings: [review-findings-1.md](T0272-fix-all-tasks-opening-over-200-ms-with/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

