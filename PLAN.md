# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [!] T0273 [reason: needs review: duplicate of T0274, already fixed on main; recommend cancelling] [owner: @claude] Fix the gallery filter popover keyboard e2e test, failing on main ba41de1: four Tabs no longer reach Clear.
- [-] T0280 [protocol: adhoc] [reason: Duplicate of T0282, which fixes the same gallery toast and Settings shortcuts e2e tests.] Fix the gallery toast e2e test, whose aria-live locator also matches the task editor count specimen added in T0258.
- [~] T0277 [owner: @claude] Replace the todos icons, favicon, and manifest icons with the shared support.webapp hexagon icon set.
- [ ] T0283 Vendor support.webapp v0.2.0 and compare the screenshots.
- [-] T0281 [reason: Duplicate of T0282, which fixes the same gallery toast and Settings shortcuts e2e tests.] Fix the gallery toast e2e test's live-region locator and the Settings shortcut list e2e test, both failing on main.
- [ ] T0282 Fix the stale e2e tests for the Settings shortcuts list and the gallery toast live region.
- [-] T0279 [protocol: adhoc] [reason: Duplicate of T0282, which fixes the same gallery toast and Settings shortcuts e2e tests.] Scope the toast test's polite live region locator, which also matches the task editor's count since T0258.
- [ ] T0278 [protocol: adhoc] Drop the task list's filter-hide toast logic, since only ticks post from rows and always show Undo.
- [-] T0276 [reason: Duplicate of T0282, which fixes the same gallery toast and Settings shortcuts e2e tests.] Fix the gallery toast e2e test, whose aria-live locator also matches the task editor count region added in T0258.
- [ ] T0275 Make the e2e suite stable under full parallel load: all-tasks.spec.js:591 and sidebar-find.spec.js:43 each failed once.
- [x] T0274 Fix the popover keyboard e2e test in behaviors.spec.js failing on main: Tab never reaches the Clear button.
- [x] T0257 Design a tabbed task editor and a clearer status and count interaction, with wireframes and human sign-off.
- [x] T0240 Make Delete all data also erase the account's lists and tasks while connected, queued while offline.
- [x] T0267 Move scripts/devops.py onto support-python v3.3.0 DevopsCli, keeping todos-specific release steps as a Project.release override.
- [x] T0258 Replace the task editor's status actions with four state buttons and a count stepper, as designed in T0257.
- [x] T0259 Make the task row's status button tick by target, never untick, and offer Undo after every tick.
- [!] T0254 [reason: blocked: support.webapp has no release with T0049 yet; its checkout is 0.1.1-pre, latest tag v0.1.0. Release 0.1.1 there, then vendor it here.] [owner: @claude, session: claude-20261117-fc9300] [protocol: adhoc] Vendor the support.webapp release with the rectangular switch from its T0049.
- [x] T0241 Erase the last account's lists and tasks on the next connect after Delete all data in local mode.
- [x] T0260 Remove the task row's status menu, now that the task editor holds every status action.
- [x] T0263 Reorder task rows by press-and-drag on desktop, long hold on touch, and Alt keys, with an outside handle.
- [x] T0264 Redesign the task row as a description line plus a meta line, with overdue due text in orange.
- [x] T0076 Add Move to top and Move to bottom to the Lists screen menu and Alt+Home and Alt+End in both list surfaces.
- [x] T0262 Split the task editor into Content, Status, and History tabs, with Delete in a header More menu.
- [x] T0265 Remove the task row's More button and menu, now that the editor and the move keys cover them.
- [x] T0271 Fix the Lists Back scroll restore clamping at 10958 px with 300 content-visibility rows, flaky in lists-many-rows e2e.
- [x] T0270 Window the Lists screen rows so 500 lists open within twice the 150-list time.

## Backlog
- [ ] T0268 Add the Reminders section to the settings wireframe and check real notifications in Chrome and Firefox.
- [ ] T0227 Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
- [ ] T0266 Sync view options, list order, the Lists screen sort, and Enter adding through the account while connected
