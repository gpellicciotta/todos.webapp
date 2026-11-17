# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [ ] T0265 [needs: T0264] Remove the task row's More button and menu, now that the editor and the move keys cover them.
- [ ] T0264 [needs: T0263] Redesign the task row as a description line plus a meta line, with overdue due text in orange.
- [ ] T0263 [needs: T0260] Reorder task rows by press-and-drag on desktop, long hold on touch, and Alt keys, with an outside handle.
- [ ] T0262 [needs: T0258] Split the task editor into Content, Status, and History tabs, with Delete in a header More menu.
- [ ] T0260 [needs: T0259] Remove the task row's status menu, now that the task editor holds every status action.
- [ ] T0259 [needs: T0258] Make the task row's status button tick by target, never untick, and offer Undo after every tick.
- [ ] T0258 [needs: T0257] Replace the task editor's status actions with four state buttons and a count stepper, as designed in T0257.
- [!] T0257 [reason: needs review: sign off the wireframes and design text, then T0258 to T0265 get revised] [owner: @claude] Design a tabbed task editor and a clearer status and count interaction, with wireframes and human sign-off.
- [!] T0254 [reason: blocked: support.webapp has no release with T0049 yet; its checkout is 0.1.1-pre, latest tag v0.1.0. Release 0.1.1 there, then vendor it here.] [owner: @claude, session: claude-20261117-fc9300] [protocol: adhoc] Vendor the support.webapp release with the rectangular switch from its T0049.
- [ ] T0241 [needs: T0240] Erase the last account's lists and tasks on the next connect after Delete all data in local mode.
- [!] T0240 [reason: needs review: contract suite needs rebuilt todos-server jar (sibling write) and human confirmation that T0257 is deployed to production] [owner: @claude] Make Delete all data also erase the account's lists and tasks while connected, queued while offline.
- [ ] T0076 [needs: T0263] Add Move to top and Move to bottom to the Lists screen menu and Alt+Home and Alt+End in both list surfaces.
- [ ] T0271 Fix the Lists Back scroll restore clamping at 10958 px with 300 content-visibility rows, flaky in lists-many-rows e2e.
- [ ] T0270 Window the Lists screen rows so 500 lists open within twice the 150-list time.
- [ ] T0267 Move scripts/devops.py onto support-python v3.3.0 DevopsCli, keeping todos-specific release steps as a Project.release override.

## Backlog
- [ ] T0268 Add the Reminders section to the settings wireframe and check real notifications in Chrome and Firefox.
- [ ] T0266 Sync view options, list order, the Lists screen sort, and Enter adding through the account while connected
- [ ] T0227 Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
