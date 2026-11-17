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
usage:
  worker: {turns: 1, duration_s: 601.1, input: 62, output: 13053, cache_read: 2255388, cache_write: 91321}
  review: {turns: 1, duration_s: 245.5, input: 65239, output: 2984, cache_read: 586496, cache_write: 0}
review_status: rejected
review_round: 1
review_requested_at: "2026-11-17T08:45:17Z"
reviewed_by: "@codex"
review_session: codex-20261117-904760
work_duration: 858.4
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

