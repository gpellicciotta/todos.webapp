---
id: T0297
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-24T15:09:36Z"
ended_at: —
review: agent
preview: none
protocol: standard
review_status: pending
review_round: 1
review_requested_at: "2026-11-24T15:17:14Z"
---
# T0297: Show a connected empty state in All tasks without the Connect link once all tasks are deleted while connected

## Goals
Make the All tasks empty state reflect the session, so a connected account without tasks never offers Connect.
While connected, the empty state reads "No tasks yet. Your tasks sync across your devices." and offers only Import a backup.
While local, it keeps today's first-launch text and both links.
The empty state redraws when the session changes, without a store change.
Completion check: `npx vitest run tests/unit/all-tasks.test.js` and `npx playwright test tests/e2e/all-tasks.spec.js`.
Size estimate: 4 files, 120 lines.

## Task Execution Steps
- [x] **[Read]**      Read the All tasks empty state, the session API, and the First Launch flow in ui-design.md.
- [x] **[Implement]** Add unit tests for the connected empty state, its local text, and redraw on session change.
- [x] **[Verify]**    Run the new unit tests and confirm they fail against the current empty state.
- [x] **[Implement]** Choose empty-state text and links by session state and redraw on session change.
- [x] **[Verify]**    Run the unit tests, the All tasks e2e suite, and the connected e2e scenario.
- [x] **[Visual]**    Capture before and after screenshots of the connected empty state in the browser.
- [x] **[Doc]**       Update the First Launch flow in ui-design.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Visual]**
  Captured the connected empty state before and after the fix in compact, wide, and dark wide layouts.
  - Before: [empty-connected-before-wide.png](T0297-show-a-connected-empty-state-in-all-tasks/empty-connected-before-wide.png).
  - After: [empty-connected-after-wide.png](T0297-show-a-connected-empty-state-in-all-tasks/empty-connected-after-wide.png).

- [2026-11-24] **[Verify]**
  Recorded task outcomes.
  - Files touched: 4.
  - Lines touched: 123.
  - Reopenings: 0.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

