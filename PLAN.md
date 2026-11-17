# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [ ] T0265 [needs: T0264] Remove the task row's More button and menu, now that the editor and the move keys cover them.
- [ ] T0264 [needs: T0263] Redesign the task row as a description line plus a meta line, with overdue due text in orange.
- [ ] T0263 [needs: T0260] Reorder task rows by press-and-drag on desktop, long hold on touch, and Alt keys, with an outside handle.
- [ ] T0262 [needs: T0258] Split the task editor into Content, Status, and History tabs, with Delete in a header More menu.
- [-] T0261 [reason: The count moved into a badge on the status button, so the row needs no count popover.] Turn the row's count chip into a button opening a minus, count, plus popover for targets above 1.
- [ ] T0260 [needs: T0259] Remove the task row's status menu, now that the task editor holds every status action.
- [ ] T0259 [needs: T0258] Make the task row's status button tick by target, never untick, and offer Undo after every tick.
- [ ] T0258 [needs: T0257] Replace the task editor's status actions with four state buttons and a count stepper, as designed in T0257.
- [~] T0257 [owner: @claude-code] Design a tabbed task editor and a clearer status and count interaction, with wireframes and human sign-off.
- [x] T0256 Let users resize the task editor panel and the lists sidebar by dragging on desktop, remembered per device.
- [x] T0255 [owner: @claude, session: claude-20261117-27758f] [protocol: adhoc] Close the task editor when the row of the task it shows is clicked again.
- [!] T0254 [reason: blocked: support.webapp has no release with T0049 yet; its checkout is 0.1.1-pre, latest tag v0.1.0. Release 0.1.1 there, then vendor it here.] [owner: @claude, session: claude-20261117-fc9300] [protocol: adhoc] Vendor the support.webapp release with the rectangular switch from its T0049.
- [x] T0253 [owner: @claude, session: claude-20261117-19e435] [protocol: adhoc] Add at least 0.5rem of space above the Search or add a task bar.
- [x] T0252 [owner: @claude, session: claude-20261117-a6d051] [protocol: adhoc] Give Keyboard shortcuts its own Settings section, keeping About as the last section.
- [ ] T0251 Move the view's More menu to a vertical three-dot button beside the account button in the desktop header.
- [ ] T0250 Let task lists, the Lists screen, and the Recycle Bin fill the main area's width instead of a 45rem column.
- [ ] T0249 Sync Delete permanently and Empty recycle bin to the account while connected, queued while offline.
- [ ] T0248 [needs: T0247] Add Restore all and Delete all for the entries matching the Recycle Bin filter.
- [ ] T0247 Add a find field and an All, Lists, Tasks choice to the Recycle Bin to filter its entries.
- [ ] T0246 [protocol: adhoc] Keep the sync indicator spinning, in the primary blue, for at least one full turn per run instead of flickering.
- [ ] T0245 Merge the connect screen into the Settings Connection section, keeping #/connect as an alias for the Auth return.
- [ ] T0243 Fix first-connect upload losing lists whose IDs match trashed server lists, and make restore re-send memberships.
- [ ] T0242 Add Delete account to Settings, marking the connected account for deletion on the service.
- [ ] T0241 [needs: T0240] Erase the last account's lists and tasks on the next connect after Delete all data in local mode.
- [ ] T0240 Make Delete all data also erase the account's lists and tasks while connected, queued while offline.
- [ ] T0238 Make the compact layout shell e2e test wait for the action bar, since full parallel runs fail it.
- [ ] T0221 Prune Lists filter ids of deleted lists before the All tasks hidden-task toast, which now reads 'Task added. hides it.'
- [ ] T0222 [needs: T0221] Name the Shared filter in the hidden-task toast and let Show clear it.
- [ ] T0217 Show the Finished today only choice in the view options wireframe and the gallery's Status popover samples.
- [ ] T0218 Evaluate adopting DevopsCli from support-python v3.3.0, modeled on support.webapp's devops script.
- [ ] T0226 Notify the user when a task comes due while the app is open, with opt-in and a lead time.
- [ ] T0072 Make the sidebar scroll only its lists, keep the current list in view, and patch rows in place.
- [ ] T0073 [needs: T0072] Add the find field, roving focus, and the l shortcut to the sidebar lists.
- [ ] T0074 Add the find bar, sort menu, info line, and Create list offer to the Lists screen.
- [ ] T0075 [needs: T0074] Render long Lists screens with content-visibility and lazy row menus, with roving focus between rows.
- [ ] T0076 [needs: T0072, T0074, T0263] Add Move to top and Move to bottom to the Lists screen menu and Alt+Home and Alt+End in both list surfaces.
- [ ] T0077 [needs: T0073, T0075] Add a 150-list render check to the performance spec, and record 500 lists.
- [ ] T0078 [needs: T0074] Add the Shared only filter to the Lists screen sort menu while connected.

## Backlog
- [ ] T0266 Sync view options, list order, the Lists screen sort, and Enter adding through the account while connected
- [ ] T0227 [needs: T0226] Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
