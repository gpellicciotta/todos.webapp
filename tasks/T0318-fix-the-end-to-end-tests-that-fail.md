---
id: T0318
owner: ~
needs: [T0306]
branch: —
worktree: —
status: ready
started_at: —
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
- [ ] **[Read]**      Run `npm run test:e2e` and record each failure and its cause.
- [ ] **[Implement]** Fix each cause, in the app or in the outdated test.
- [ ] **[Verify]**    Run `npm run test:e2e` and `npm test` and record the passing output.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.
