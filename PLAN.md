# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [x] T0209 [owner: @claude-code] [protocol: adhoc] Add a --port option to devops.py server start and server stop.
- [x] T0208 [owner: @claude-code] [protocol: adhoc] Add server start and server stop commands to devops.py, serving the app in the foreground or background.
- [x] T0207 Match the app icon and favicon to the Todos tile of the apps portal.
- [x] T0079 Send a random state when signing in through Auth and reject a callback whose state does not match, to prevent login CSRF; needs Auth app-state support (auth T0206).
- [x] T0071 Add shared helpers to find, sort, and count lists, with unit tests.
- [x] T0043 Speed up the cold launch toward TEC-16, smooth throttled scrolling, and support rows taller than 48 px in long lists.
- [x] T0004 Show service broadcasts and the notification inbox while connected.
- [x] T0062 Activate a new service worker only after an Update toast click, and survive blocked database upgrades.
- [x] T0025 Build sync upload: the change queue, first-connect adoption of local data, and rollback of rejected changes.
- [x] T0026 Build sync download: the change feed client, per-field merge, lost access handling, and the sync log store.
- [x] T0063 Add an opt-in contract test that runs the sync client against a real todos server.
- [x] T0064 Queue and sync the changes of a backup import while connected, comparing rows by last update.
- [x] T0027 Show every sync state in the sync indicator and build the Sync log screen.
- [x] T0056 Design how the sidebar and Lists screen look and behave with many lists, 100 and more.
- [x] T0028 Add the Sharing section to the list editor, role-aware controls, and the Shared filter.
- [x] T0053 Remember view options per list instead of one shared setting, with a reset to the shared defaults.
- [!] T0065 [reason: needs review: release must run on main and push the commit, tag v0.3.0, and create a GitHub release. This loop forbids pushes and version bumps, and the guidelines require explicit user confirmation before publishing. Run 'python scripts/devops.py release 0.3.0' from main yourself.] [owner: @claude] Release (and publish) all changes as v0.3.0, via the devops.py script

## Backlog
- [ ] T0080 Fix the flaky connect e2e test: the first sync pull adds a second GET /api/users/me to the recorded calls.
- [ ] T0070 Make throttled scrolling smoother by cutting the work per entering row in long lists.
- [ ] T0072 Make the sidebar scroll only its lists, keep the current list in view, and patch rows in place.
- [ ] T0073 [needs: T0072] Add the find field, roving focus, and the l shortcut to the sidebar lists.
- [ ] T0074 Add the find bar, sort menu, info line, and Create list offer to the Lists screen.
- [ ] T0075 [needs: T0074] Render long Lists screens with content-visibility and lazy row menus, with roving focus between rows.
- [ ] T0076 [needs: T0072, T0074] Add Move to top and Move to bottom to the Lists screen menu and Alt+Shift+arrow keys in both list surfaces.
- [ ] T0077 [needs: T0073, T0075] Add a 150-list render check to the performance spec, and record 500 lists.
- [ ] T0078 [needs: T0074] Add the Shared only filter to the Lists screen sort menu while connected.
