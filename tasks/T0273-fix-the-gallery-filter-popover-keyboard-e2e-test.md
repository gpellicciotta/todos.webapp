---
id: T0273
owner: "@claude"
session: claude-20261117-51c3e3
needs: []
branch: task/T0273-fix-the-gallery-filter-popover-keyboard-e2e-test
worktree: .plan/work/T0273-fix-the-gallery-filter-popover-keyboard-e2e-test
status: suspended
started_at: "2026-11-17T18:15:12Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0273: Fix the gallery filter popover keyboard e2e test, failing on main ba41de1: four Tabs no longer reach Clear.

## Goals
Fix the gallery filter popover keyboard e2e test, failing on main ba41de1 at the chip focus after Escape.

## Task Execution Steps
- [ ] **[Implement]** Implement required changes for T0273.
- [ ] **[Verify]**    Verify implementation with automated test suites.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Verify]**
  T0274 commit 30be458 already fixed this test on main; it passes 10 of 10 repeats, with gallery-controls too.
  - No code change needed.
  - Proof in validation-proof.md.

- [2026-11-17] **[Review]**
  Duplicate of T0274; recommend cancelling T0273. Open question: cancel as duplicate, or keep with another scope?.

