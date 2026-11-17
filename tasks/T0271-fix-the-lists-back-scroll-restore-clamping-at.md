---
id: T0271
owner: "@claude"
session: claude-20261117-15ecf0
needs: []
branch: task/T0271-fix-the-lists-back-scroll-restore-clamping-at
worktree: .plan/work/T0271-fix-the-lists-back-scroll-restore-clamping-at
status: active
started_at: "2026-11-17T08:35:07Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0271: Fix the Lists Back scroll restore clamping at 10958 px with 300 content-visibility rows, flaky in lists-many-rows e2e

## Goals
Fix the Lists Back scroll restore clamping at 10958 px with 300 content-visibility rows, flaky in lists-many-rows e2e.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0271.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Verify]**
  Fixed clamp: rows sized 48 px, router retries restore; e2e 40/40, unit 1685 pass.
  - Files touched: 5.
  - Lines touched: 75.
  - Reopenings: 0.

- [2026-11-17] **[Implement]**
  Sized unrendered rows at 48 px and made the router retry clamped scroll restores.

- [2026-11-17] **[Doc]**
  Updated CHANGELOG.md and the Lists rendering decision in ui-design.md.

