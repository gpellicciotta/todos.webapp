# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [x] T0219 Make a task added in All tasks join no list, even while the Lists filter selects lists.
- [x] T0216 Add a Finished today only choice to the Status filter of the view options.
- [x] T0215 Keep focus in the add field after adding a task on wide screens, while the task editor still opens.
- [x] T0214 List the keyboard shortcuts in the About section of Settings.
- [x] T0213 Add a Delete all data action with typed confirmation to the Data section of Settings.
- [x] T0212 Add an Empty recycle bin action with confirmation to the recycle bin screen.
- [x] T0211 Make the service worker reject HTML served for asset files, at install and at fetch.

## Backlog
- [ ] T0222 Name the Shared filter in the hidden-task toast and let Show clear it.
- [ ] T0221 Prune Lists filter ids of deleted lists before the All tasks hidden-task toast, which now reads 'Task added. hides it.'
- [ ] T0218 Evaluate adopting DevopsCli from the released support-python v2.0.0, keeping project-specific actions through add_action.
- [ ] T0080 Fix the flaky connect e2e test: the first sync pull adds a second GET /api/users/me to the recorded calls.
- [ ] T0070 Make throttled scrolling smoother by cutting the work per entering row in long lists.
- [ ] T0072 Make the sidebar scroll only its lists, keep the current list in view, and patch rows in place.
- [ ] T0073 [needs: T0072] Add the find field, roving focus, and the l shortcut to the sidebar lists.
- [ ] T0074 Add the find bar, sort menu, info line, and Create list offer to the Lists screen.
- [ ] T0075 [needs: T0074] Render long Lists screens with content-visibility and lazy row menus, with roving focus between rows.
- [ ] T0076 [needs: T0072, T0074] Add Move to top and Move to bottom to the Lists screen menu and Alt+Shift+arrow keys in both list surfaces.
- [ ] T0077 [needs: T0073, T0075] Add a 150-list render check to the performance spec, and record 500 lists.
- [ ] T0078 [needs: T0074] Add the Shared only filter to the Lists screen sort menu while connected.
- [ ] T0217 Show the Finished today only choice in the view options wireframe and the visual style gallery sample.
- [ ] T0220 Make the gallery keyboard-stop focus ring tests fast enough to pass under parallel load.
