---
id: T0046
owner: "@claude"
session: claude-20261107-da930f
needs: []
branch: task/T0046-make-lists-re-orderable-in-the-front-end
worktree: .plan/work/T0046-make-lists-re-orderable-in-the-front-end
status: active
started_at: "2026-11-07T12:24:39Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1117.4, input: 224, output: 84764, cache_read: 12281698, cache_write: 255408}
review_status: pending
review_round: 1
---
# T0046: Make lists re-orderable in the front-end only, without back-end storage

## Goals
Let users drag or keyboard-move lists into any order in the sidebar and the Lists screen.
The order stays on the device only; the back end and the sync model are untouched.
New lists append at the end.
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

## Task Execution Steps
- [x] **[Read]**      Read reorder.js and preferences.js to reuse the task reorder model.
- [x] **[Implement]** Author tests: ordering helper, persistence, and drag plus keyboard reorder.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Add the list order helper and device preference, then apply it in sidebar and Lists screen.
- [x] **[Implement]** Add drag handles and Move up and Move down actions to list rows.
- [x] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Sidebar reorders by Alt+Up and Alt+Down only; Lists screen adds drag handle and Move buttons. reorder.js gained row, handle, idKey options.

- [2026-11-07] **[Verify]**
  Tests failed first, then passed after implementation.
  - npm test: 775 passed.
  - Playwright: 146 passed.

- [2026-11-07] **[Doc]**
  Size note: 14 files and 735 lines exceed the estimate; the sidebar, Lists screen, drag reuse, worker precache, and docs ship together.

- [2026-11-07] **[Read]**
  Read reorder.js, preferences.js, lists.js, and layout.js to reuse the task reorder model.

- [2026-11-07] **[Implement]**
  Added list-order.js, the Lists screen handles and Move buttons, sidebar Alt+Arrow moves, and service worker precache entry.

- [2026-11-07] **[Verify]**
  Recorded task outcomes.
  - Files touched: 14.
  - Lines touched: 735.
  - Reopenings: 0.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

