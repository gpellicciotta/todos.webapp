# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [~] T0287 [owner: @claude] Design and add the app nav toggle with a sidebar icon rail that shows list items.
- [ ] T0266 Sync view options, list order, the Lists screen sort, and Enter adding through the account while connected
- [x] T0275 Make the e2e suite stable under full parallel load: all-tasks.spec.js:591 and sidebar-find.spec.js:43 each failed once.
- [ ] T0254 [owner: @claude, session: claude-20261117-fc9300] [protocol: adhoc] Vendor the support.webapp release with the rectangular switch from its T0049.
- [ ] T0285 Fix the three test_devops.py release tests failing on main at 1ee04e2, including the release dry run.
- [ ] T0284 [protocol: adhoc] Fix the Ruff format check failing on main in tests/test_draw_wireframes.py near line 207.
- [ ] T0286 [needs: T0254, T0285, T0284] Release todos.webapp v0.6.0 with devops release, push main, the tag, and plan, and publish the GitHub release.

## Backlog
- [ ] T0268 Add the Reminders section to the settings wireframe and check real notifications in Chrome and Firefox.
- [ ] T0227 Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
