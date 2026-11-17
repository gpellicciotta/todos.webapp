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
  worker: {turns: 1, duration_s: 1800.3, input: 2, output: 3}
work_duration: 1810.0
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
- [ ] **[Verify]**    Run `npm test`, the e2e suite, and `npm run test:contract`, and record the passing output.
- [ ] **[Doc]**       Update ui-design.md, devops.md if the contract setup changes, and CHANGELOG.md.
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

