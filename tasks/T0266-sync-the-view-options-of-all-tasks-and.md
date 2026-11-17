---
id: T0266
owner: "@claude"
session: claude-20261117-c62e8f
needs: []
branch: task/T0266-sync-the-view-options-of-all-tasks-and
worktree: .plan/work/T0266-sync-the-view-options-of-all-tasks-and
status: active
started_at: "2026-11-17T22:11:50Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 3, duration_s: 2133.9, input: 30, output: 6740, cache_read: 3774148, cache_write: 17505}
  review: {turns: 1, duration_s: 374.6, input: 30, output: 10474, cache_read: 1195324, cache_write: 78497}
work_duration: 2569.2
review_status: rejected
review_round: 1
review_requested_at: "2026-11-17T22:48:18Z"
reviewed_by: "@claude"
review_session: claude-20261117-361149
---
# T0266: Sync view options, list order, the Lists screen sort, and Enter adding through the account while connected

## Goals
Make the user's settings follow the account across devices while connected (`SYN-13`).
- Sync view options, list order, the Lists screen sort, and Enter adding through the service's user settings routes.
- Merge each setting by edit time, so the latest change wins, also after an offline period.
- Keep the server URL, the theme, and everything in local mode on the device.
- Blocked until todos.server completes T0262, the user settings routes.
Rules, size, and tests: [technical-spec.md](T0266-sync-the-view-options-of-all-tasks-and/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the service's settings routes, preferences.js, view-controls.js, list-order.js, settings.js, and engine.js.
- [x] **[Implement]** Author failing unit tests for edit times, the merge, the upload queue, and the view refresh.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Add the settings sync module, record edit times on writes, and run it in each sync run.
- [x] **[Implement]** Author the two-device e2e scenario and the settings contract test.
- [x] **[Verify]**    Run `npm test`, the e2e suite, and `npm run test:contract`, and record the passing output.
- [x] **[Doc]**       Update ui-design.md, devops.md if the contract setup changes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md; changed TV-12 to sync view options while connected.

- [2026-11-17] **[Doc]**
  Widened to list order, Lists screen sort, and Enter adding per the user; added SYN-13 and updated LST-8, LST-12, VO-3.

- [2026-11-17] **[Doc]**
  Renamed synced settings to their full todos.-prefixed keys, which todos.server T0262 now requires.

- [2026-11-17] **[Implement]**
  Added the settings sync module, edit times in preferences.js, the engine step and edit kick, and redraws on download.
  - Commits 8baaac6 and b1848c0.
  - Unblocked: todos.server T0262 landed as 16ad8ee.

- [2026-11-17] **[Implement]**
  Touched undeclared files: reorder.js and lists.js for the drag deferral, settings.js for the switch, and four test fixtures.
  - Also index.html and service-worker.js for the new module.
  - Also tests/e2e/shell.spec.js to mock the settings route.

- [2026-11-17] **[Implement]**
  Size note: 19 counted files and 423 lines cross the typical line; one sync mechanism serves every setting, so a split would duplicate it.

- [2026-11-17] **[Verify]**
  Unit, full e2e, lint, service worker check, and contract suites passed; see validation-proof.md.
  - npm test: 1783 passed.
  - npx playwright test: 274 passed.
  - Contract: 22 passed against a scratch todos.server build.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 19.
  - Lines touched: 423.
  - Reopenings: 0.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 rejected by @claude: The settings sync is mostly sound and well tested.
  - Findings: [review-findings-1.md](T0266-sync-the-view-options-of-all-tasks-and/review-findings-1.md).

- [2026-11-18] **[Implement]**
  Fixed review round 1: the engine prunes view options only for purged lists, passing live and recycle bin list IDs.
  - Engine-wiring unit test: binned keeps, purged sends null.
  - Settings switch listener stops on destroy; e2e asserts a 304.
  - Commit f02e392.

- [2026-11-18] **[Verify]**
  Reran unit, lint, service worker check, full e2e, and contract suites after the rework; all passed.
  - npm test: 1785 passed.
  - npx playwright test: 274 passed.
  - Contract: 22 passed.

- [2026-11-18] **[Verify]**
  Recorded task outcomes.
  - Files touched: 19.
  - Lines touched: 453.
  - Reopenings: 0.

