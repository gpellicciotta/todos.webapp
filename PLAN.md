# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## v0.2.0 Milestone
- [ ] T0058 [protocol: adhoc] [needs: T0057, T0055, T0046, T0048] Release (and publish) all changes as v0.2.0, via the devops.py script
- [ ] T0055 [needs: T0054] Make the add field also search, with Add anyway, a hidden-task toast, and Add-only creation.
- [ ] T0054 Build the View options panel, the More menu entries, and the info line for All tasks and list views.
- [ ] T0046 Make lists re-orderable in the front-end only, without back-end storage.
- [ ] T0048 [needs: T0054] Let the All tasks dashboard group tasks by List, Due Date, or Status.
- [ ] T0057 [protocol: adhoc] Add devops.py script just like in other projects

## v0.3.0 Milestone
- [ ] T0025 Build sync upload: the change queue, first-connect adoption of local data, and rollback of rejected changes.
- [ ] T0026 [needs: T0025] Build sync download: the change feed client, per-field merge, lost access handling, and the sync log store.
- [ ] T0027 [needs: T0026] Show every sync state in the sync indicator and build the Sync log screen.
- [ ] T0028 [needs: T0026] Add the Sharing section to the list editor, role-aware controls, and the Shared filter.
- [ ] T0043 Speed up the cold launch toward TEC-16, smooth throttled scrolling, and support rows taller than 48 px in long lists.
- [ ] T0056 [protocol: standard] Design how the left-bar Lists should behave when there are many lists, effectively needing scrolling and pushing Recyle Bin and Settings out of sight
- [ ] T0053 Remember view options per list instead of one shared setting, with a reset to the shared defaults.

## Backlog
- [ ] T0004 Show service broadcasts and the notification inbox while connected.
