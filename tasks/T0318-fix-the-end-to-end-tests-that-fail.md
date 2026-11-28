---
id: T0318
owner: "@claude"
session: claude-20261128-0de444
needs: []
branch: task/T0318-fix-the-end-to-end-tests-that-fail
worktree: .plan/work/T0318-fix-the-end-to-end-tests-that-fail
status: active
started_at: "2026-11-28T04:17:19Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0318: Fix the end-to-end tests that fail on main since the ADR-0006 local store changes

## Goals
Make `npm run test:e2e` pass on main again; the release and the Pages deployment run it.
At commit 3c0ae4f, eight tests failed: all-tasks (3), task-editor (2), backup (1), list (1), and store-upgrade (1).
Fix product defects, or update tests that expect behavior that ADR-0006 replaced; never weaken an assertion otherwise.
Files, tests, and size: [technical-spec.md](T0318-fix-the-end-to-end-tests-that-fail/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Run `npm run test:e2e` and record each failure and its cause.
- [x] **[Implement]** Fix each cause, in the app or in the outdated test.
- [x] **[Verify]**    Run `npm run test:e2e` and `npm test` and record the passing output.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Read]**
  Ran e2e: 6 failed, all outdated tests; task-editor failures no longer reproduce on this base.

- [2026-11-28] **[Implement]**
  Updated Failed status counts, log event types, and the v5 upgrade fixture events; no product change.

- [2026-11-28] **[Verify]**
  e2e 299 passed; unit 2011 passed.
  - Files touched: 5.
  - Lines touched: 20.
  - Reopenings: 0.

- [2026-11-28] **[Doc]**
  Added a Tests bullet to CHANGELOG.md.

