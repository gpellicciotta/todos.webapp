---
id: T0046
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
# T0046: Make lists re-orderable in the front-end only, without back-end storage

## Goals
Let users drag or keyboard-move lists into any order in the sidebar and the Lists screen.
The order stays on the device only; the back end and the sync model are untouched.
New lists append at the end.
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

## Task Execution Steps
- [ ] **[Read]**      Read reorder.js and preferences.js to reuse the task reorder model.
- [ ] **[Implement]** Author tests: ordering helper, persistence, and drag plus keyboard reorder.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Add the list order helper and device preference, then apply it in sidebar and Lists screen.
- [ ] **[Implement]** Add drag handles and Move up and Move down actions to list rows.
- [ ] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.
