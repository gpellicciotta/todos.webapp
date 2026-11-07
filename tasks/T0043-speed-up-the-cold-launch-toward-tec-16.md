---
id: T0043
owner: "@claude"
session: claude-20261107-55dd42
needs: []
branch: task/T0043-speed-up-the-cold-launch-toward-tec-16
worktree: .plan/work/T0043-speed-up-the-cold-launch-toward-tec-16
status: active
started_at: "2026-11-07T18:01:50Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 3602.4, input: 4, output: 40}
work_duration: 1820.4
---
# T0043: Speed up the cold launch toward TEC-16, smooth throttled scrolling, and support rows taller than 48 px in long lists

## Goals
Speed up the cold launch toward TEC-16, smooth throttled scrolling, and support rows taller than 48 px in long lists.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0043.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Implement]**
  Deferred sidebar and maintenance reads past the first rows, preloaded modules, and measured row heights for long lists.
  - Cold start halved unthrottled, side by side.

- [2026-11-07] **[Verify]**
  Lint, 866 unit, 164 end-to-end tests pass; 4x scroll frames not smoother, moved to T0070.
  - Files touched: 14.
  - Lines touched: 800.
  - Reopenings: 0.

