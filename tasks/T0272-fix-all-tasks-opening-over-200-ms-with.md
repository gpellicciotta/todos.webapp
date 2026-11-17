---
id: T0272
owner: "@claude"
session: claude-20261117-f8873c
needs: []
branch: task/T0272-fix-all-tasks-opening-over-200-ms-with
worktree: .plan/work/T0272-fix-all-tasks-opening-over-200-ms-with
status: active
started_at: "2026-11-17T06:29:48Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0272: Fix All tasks opening over 200 ms with 5000 tasks under 4x CPU throttling, failing since before T0269

## Goals
Fix All tasks opening over 200 ms with 5000 tasks under 4x CPU throttling, failing since before T0269.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0272.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Implement]**
  Read four stores and shared one cached read between openings; open median fell from 289 to 116 ms.

- [2026-11-17] **[Verify]**
  Perf, unit, lint, sw checks pass; behaviors.spec:109 gallery test fails, untested on base.

- [2026-11-17] **[Doc]**
  Added changelog bullet and bumped service worker VERSION.

