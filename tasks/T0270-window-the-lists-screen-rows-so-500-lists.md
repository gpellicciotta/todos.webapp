---
id: T0270
owner: "@claude"
session: claude-20261117-9c5d75
needs: []
branch: task/T0270-window-the-lists-screen-rows-so-500-lists
worktree: .plan/work/T0270-window-the-lists-screen-rows-so-500-lists
status: active
started_at: "2026-11-17T09:00:07Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 3, duration_s: 2486.1, input: 52, output: 11416, cache_read: 5277491, cache_write: 23554}
work_duration: 1855.2
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T09:42:28Z"
---
# T0270: Window the Lists screen rows so 500 lists open within twice the 150-list time

## Goals
Window the Lists screen rows so 500 lists open within twice the 150-list time.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0270.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Implement]**
  Windowed Lists rows past 200 shown lists, keeping the tab stop, focus, menus, and drags rendered; tests rewritten first and seen failing.

- [2026-11-17] **[Verify]**
  500 lists opened in 195 ms against 169 ms for 150; unit 1691, lint, sw check, lists e2e 48/48 pass.
  - Full e2e: 245 pass; gallery popover test fails on base too, T0273.
  - Later perf runs were load-skewed; base failed equally.

- [2026-11-17] **[Doc]**
  Updated ui-design.md rendering, budget, and alternatives, plus CHANGELOG.md; bumped the service worker version.

- [2026-11-17] **[Verify]**
  Size note: 7 counted files and 623 lines cross the typical line; windowing and its changed tests are one concern.
  - Files touched: 7.
  - Lines touched: 623.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

