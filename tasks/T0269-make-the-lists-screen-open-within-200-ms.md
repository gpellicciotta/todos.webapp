---
id: T0269
owner: "@claude"
session: claude-20261117-187e04
needs: []
branch: task/T0269-make-the-lists-screen-open-within-200-ms
worktree: .plan/work/T0269-make-the-lists-screen-open-within-200-ms
status: active
started_at: "2026-11-17T05:12:03Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0269: Make the Lists screen open within 200 ms with 150 lists and 5000 tasks under 4x CPU throttling

## Goals
Make the Lists screen open within 200 ms with 150 lists and 5000 tasks under 4x CPU throttling.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0269.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Implement]**
  Added a shared cached list snapshot used by the sidebar and Lists screen, plus the 150 and 500-list perf tests.
  - 150 lists: 389 ms to 165 ms.
  - 500 lists: 366 ms; windowing task T0270 added.

- [2026-11-17] **[Verify]**
  Unit, lint, sw check, and Lists e2e pass; two All tasks perf tests fail on the base too.

- [2026-11-17] **[Doc]**
  Updated ui-design.md and CHANGELOG.md; T0077 test overlaps and now only needs its doc step.

