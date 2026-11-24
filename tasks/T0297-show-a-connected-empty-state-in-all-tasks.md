---
id: T0297
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read the All tasks empty state, the session API, and the First Launch flow in ui-design.md.
- [ ] **[Implement]** Add unit tests for the connected empty state, its local text, and redraw on session change.
- [ ] **[Verify]**    Run the new unit tests and confirm they fail against the current empty state.
- [ ] **[Implement]** Choose empty-state text and links by session state and redraw on session change.
- [ ] **[Verify]**    Run the unit tests, the All tasks e2e suite, and the connected e2e scenario.
- [ ] **[Visual]**    Capture before and after screenshots of the connected empty state in the browser.
- [ ] **[Doc]**       Update the First Launch flow in ui-design.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.
