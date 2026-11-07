# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [x] T0043 Speed up the cold launch toward TEC-16, smooth throttled scrolling, and support rows taller than 48 px in long lists.
- [x] T0004 Show service broadcasts and the notification inbox while connected.
- [x] T0062 Activate a new service worker only after an Update toast click, and survive blocked database upgrades.
- [x] T0025 Build sync upload: the change queue, first-connect adoption of local data, and rollback of rejected changes.
- [ ] T0026 Build sync download: the change feed client, per-field merge, lost access handling, and the sync log store.
- [ ] T0063 [needs: T0026] Add an opt-in contract test that runs the sync client against a real todos server.
- [ ] T0064 Queue and sync the changes of a backup import while connected, comparing rows by last update.
- [ ] T0027 [needs: T0026] Show every sync state in the sync indicator and build the Sync log screen.
- [ ] T0056 Design how the sidebar and Lists screen look and behave with many lists, 100 and more.
- [ ] T0028 [needs: T0026] Add the Sharing section to the list editor, role-aware controls, and the Shared filter.
- [ ] T0053 Remember view options per list instead of one shared setting, with a reset to the shared defaults.
- [ ] T0065 [needs: T0027, T0028, T0053, T0056, T0063] Release (and publish) all changes as v0.3.0, via the devops.py script

## Backlog
- [ ] T0070 Make throttled scrolling smoother by cutting the work per entering row in long lists.
