---
id: T0271
owner: "@claude"
session: claude-20261117-15ecf0
needs: []
branch: task/T0271-fix-the-lists-back-scroll-restore-clamping-at
worktree: .plan/work/T0271-fix-the-lists-back-scroll-restore-clamping-at
status: completed
started_at: "2026-11-17T08:35:07Z"
ended_at: "2026-11-17T08:59:49Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 930.2, input: 90, output: 20085, cache_read: 3567892, cache_write: 108207}
  review: {turns: 2, duration_s: 513.5, input: 114371, output: 5119, cache_read: 1386112, cache_write: 0}
review_status: approved
review_round: 2
review_requested_at: "2026-11-17T08:55:18Z"
review_session: codex-20261117-6ab368
work_duration: 1482.4
reviewed_by: "@codex"
completion-commit: ba41de12f225502928de176ec24f8172c5a4a848
---
# T0271: Fix the Lists Back scroll restore clamping at 10958 px with 300 content-visibility rows, flaky in lists-many-rows e2e

## Goals
Fix the Lists Back scroll restore clamping at 10958 px with 300 content-visibility rows, flaky in lists-many-rows e2e.

## Task Execution Steps
- [x] **[Implement]** Implement required changes for T0271.
- [x] **[Verify]**    Verify implementation with automated test suites.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

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

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 rejected by @codex: The Lists regression checks pass, but the router introduces a navigation cancellation defect.
  - Findings: [review-findings-1.md](T0271-fix-the-lists-back-scroll-restore-clamping-at/review-findings-1.md).

- [2026-11-17] **[Implement]**
  Reworked review round 1: restore retries run unblocked and cancel on navigation; two router tests added.

- [2026-11-17] **[Verify]**
  Unit 1686, lint, lists e2e 40/40 and 43 other e2e pass.
  - Files touched: 5.
  - Lines touched: 150.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 2 approved by @codex: [Decided]** Approved.
  - Findings: [review-findings-2.md](T0271-fix-the-lists-back-scroll-restore-clamping-at/review-findings-2.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

