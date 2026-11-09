# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [~] T0216 [owner: @claude-code] Add a Finished today only choice to the Status filter of the view options.
- [x] T0215 Keep focus in the add field after adding a task on wide screens, while the task editor still opens.
- [~] T0214 [owner: @claude-code] List the keyboard shortcuts in the About section of Settings.
- [x] T0213 Add a Delete all data action with typed confirmation to the Data section of Settings.
- [x] T0212 Add an Empty recycle bin action with confirmation to the recycle bin screen.
- [x] T0211 Make the service worker reject HTML served for asset files, at install and at fetch.

## Backlog
- [ ] T0080 Fix the flaky connect e2e test: the first sync pull adds a second GET /api/users/me to the recorded calls.
- [ ] T0070 Make throttled scrolling smoother by cutting the work per entering row in long lists.
- [ ] T0072 Make the sidebar scroll only its lists, keep the current list in view, and patch rows in place.
- [ ] T0073 [needs: T0072, T0214] Add the find field, roving focus, and the l shortcut to the sidebar lists.
- [ ] T0074 [needs: T0214] Add the find bar, sort menu, info line, and Create list offer to the Lists screen.
- [ ] T0075 [needs: T0074] Render long Lists screens with content-visibility and lazy row menus, with roving focus between rows.
- [ ] T0076 [needs: T0072, T0074, T0214] Add Move to top and Move to bottom to the Lists screen menu and Alt+Shift+arrow keys in both list surfaces.
- [ ] T0077 [needs: T0073, T0075] Add a 150-list render check to the performance spec, and record 500 lists.
- [ ] T0078 [needs: T0074] Add the Shared only filter to the Lists screen sort menu while connected.
