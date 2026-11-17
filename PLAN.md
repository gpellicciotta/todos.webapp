# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [~] T0283 [owner: @claude] Vendor support.webapp v0.2.1 and compare the screenshots.
- [ ] T0282 Fix the stale e2e tests for the Settings shortcuts list and the gallery toast live region.
- [ ] T0278 [protocol: adhoc] Drop the task list's filter-hide toast logic, since only ticks post from rows and always show Undo.
- [ ] T0275 Make the e2e suite stable under full parallel load: all-tasks.spec.js:591 and sidebar-find.spec.js:43 each failed once.
- [!] T0254 [reason: blocked: support.webapp has no release with T0049 yet; its checkout is 0.1.1-pre, latest tag v0.1.0. Release 0.1.1 there, then vendor it here.] [owner: @claude, session: claude-20261117-fc9300] [protocol: adhoc] Vendor the support.webapp release with the rectangular switch from its T0049.

## Backlog
- [ ] T0285 Fix the three test_devops.py release tests failing on main at 1ee04e2, including the release dry run.
- [ ] T0284 [protocol: adhoc] Fix the Ruff format check failing on main in tests/test_draw_wireframes.py near line 207.
- [ ] T0268 Add the Reminders section to the settings wireframe and check real notifications in Chrome and Firefox.
- [ ] T0227 Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
- [ ] T0266 Sync view options, list order, the Lists screen sort, and Enter adding through the account while connected
