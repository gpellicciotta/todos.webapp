---
id: T0266
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
# T0266: Sync the view options of All tasks and each list through the account while connected, keeping them per device otherwise

## Goals
Make the view options of All tasks and of each list follow the account across devices while connected (`TV-12`).
- Sync `view.tasks` and every `view.list.{{list-id}}` through the service's user settings routes.
- Merge each option by edit time, so the latest change wins, also after an offline period.
- Keep local mode, theme, Enter adds, server URL, and list order per device.
- Blocked until todos.server completes T0262, the user settings routes.
Rules, size, and tests: [technical-spec.md](T0266-sync-the-view-options-of-all-tasks-and/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the user settings routes in the service's REST API spec, preferences.js, view-controls.js, and engine.js.
- [ ] **[Implement]** Author failing unit tests for edit times, the merge, the upload queue, and the view refresh.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Add the settings sync module, record edit times on writes, and run it in each sync run.
- [ ] **[Implement]** Author the two-device e2e scenario and the settings contract test.
- [ ] **[Verify]**    Run `npm test`, the e2e suite, and `npm run test:contract`, and record the passing output.
- [ ] **[Doc]**       Update ui-design.md, devops.md if the contract setup changes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md; changed TV-12 to sync view options while connected.
