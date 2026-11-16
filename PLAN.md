# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [ ] T0245 Merge the connect screen into the Settings Connection section, keeping #/connect as an alias for the Auth return.
- [ ] T0244 [protocol: adhoc] Replace the stale 'Syncing your data arrives in a later version' hint on the connect screen with the current sync behavior.
- [ ] T0242 Add Delete account to Settings, marking the connected account for deletion on the service.
- [ ] T0241 [needs: T0240] Erase the last account's lists and tasks on the next connect after Delete all data in local mode.
- [ ] T0240 Make Delete all data also erase the account's lists and tasks while connected, queued while offline.
- [x] T0239 [owner: @claude-code] [protocol: adhoc] Made occurrences optional when validating format 2 backups on import.

## Backlog
- [ ] T0238 Make the compact layout shell e2e test wait for the action bar, since full parallel runs fail it.
- [ ] T0227 [needs: T0226] Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
- [ ] T0226 Notify the user when a task comes due while the app is open, with opt-in and a lead time.
- [ ] T0222 Name the Shared filter in the hidden-task toast and let Show clear it.
- [ ] T0221 Prune Lists filter ids of deleted lists before the All tasks hidden-task toast, which now reads 'Task added. hides it.'
- [ ] T0218 Evaluate adopting DevopsCli from the released support-python v2.0.0, keeping project-specific actions through add_action.
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
