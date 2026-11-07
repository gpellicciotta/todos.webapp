# Changelog
All notable changes to this project are documented here.

> See [change management guidelines](https://github.com/gpellicciotta/dev-guidelines/blob/main/guidelines/change-management-guidelines.md)
> for the versioning and changelog conventions used across projects.

## v0.2.1-pre
- FrontEnd: Added shared helpers to find lists, sort them by name, open tasks, or activity, and count them in one pass.
- FrontEnd: Moved the open and total list counts of the sidebar and the Lists screen into one shared helper, without a visible change.
- Docs: Designed the sidebar and the Lists screen for 100 and more lists: a find field, sort choices, move to top or bottom, and a fixed sidebar header.
- Docs: Added requirements LST-10 to LST-16, set TEC-16 to 150 lists and 5000 tasks, and added the lists-many and lists-find wireframes.
- Docs: Removed the New list button from the sidebar wireframes and the design text, as the app dropped it earlier.
- FrontEnd: Added the Sharing section to the list editor: the owner invites an email with a role, changes a role, and removes a person.
- FrontEnd: Showed other users the owner and their own role, read-only, and disabled every sharing control offline under a banner.
- FrontEnd: Opened Share list at the Sharing section of the list editor, through the new `#/lists/{{list-id}}/share` route.
- FrontEnd: Offered each screen only the actions the user's role allows: list menus, task rows, the task editor, and the list editor.
- FrontEnd: Showed "Shared by {{owner}}" on the Lists rows and the owner and role in the list header of shared lists.
- FrontEnd: Added the Shared filter to the view options of All tasks while connected, with Any, Shared, and Not shared.
- FrontEnd: Added a More button to each row of the Lists screen with Edit list, Edit view options, Share list, and Delete list.
- FrontEnd: Removed the Move up and Move down buttons from the Lists screen; lists reorder by their grips or Alt+Up and Alt+Down, with grips on touch screens too.
- FrontEnd: Added Group by Due date or Status to the view options of every list, hiding the drag handles while grouped.
- FrontEnd: Made All tasks sort by creation time, newest first, by default, so a new task comes first.
- FrontEnd: Opened the task editor on a new task after Add, in All tasks and in every list, with the focus in the editor.
- FrontEnd: Painted the first rows before the sidebar and the start-up maintenance read the store, cutting the cold start under 4x CPU throttling.
- FrontEnd: Preloaded every app module from the start page, so a first visit fetches the import tree in one round.
- FrontEnd: Let rows of long lists be taller than 48 px: the list measures rows as they show, keeps the scroll height true, and holds the rows in view in place.
- FrontEnd: Added an Inbox bell before the user button, while connected, with an unread badge and a panel to mark read, discard, or clear all.
- FrontEnd: Showed each unread service broadcast marked as a banner above every view, with Open and Dismiss.
- FrontEnd: Loaded the inbox at start, on sign-in, when the tab turns visible, and every 2 minutes; local mode sends no request.
- FrontEnd: Made a new service worker wait until the user clicks Update on a lasting "A new version is ready" toast, then reload once.
- FrontEnd: Showed the reload banner in tabs that did not click Update, and the Close other tabs message when an old tab blocks a database upgrade.
- FrontEnd: Queued every change made while connected and uploaded it in order, without duplicates on retry.
- FrontEnd: Sent only the changed fields of an update, each with its edit time, so edits of different fields merge.
- FrontEnd: Uploaded all local data on the first connect, keeping list order and merging lists of the same name.
- FrontEnd: Undid a change the service rejects and logged it. A 401 pauses the queue, and a 426 stops syncing.
- FrontEnd: Let one tab upload at a time, with the other tabs following its state.
- FrontEnd: Pulled the service's change feed while connected, every 30 seconds and after going online, gaining focus, or replaying the queue.
- FrontEnd: Merged pulled rows per field: a field with a queued change keeps its local value, and a lost replay applies the value the service kept.
- FrontEnd: Removed a list the user lost access to, with the tasks of others in it, and told the user how many changes were undone.
- FrontEnd: Rebuilt service data from a new snapshot when the cursor expires, and stopped syncing on a newer sync protocol.
- FrontEnd: Kept own lists and tasks and removed the rest when disconnecting, without calling the service.
- FrontEnd: Logged lost access and sync errors next to overwritten and rejected changes, and purged log entries after 30 days.
- Docs: Described the version 4 store, the change queue, and first-connect adoption in the local store spec.
- Docs: Described the change feed download, the per-field merge, lost access, and the sync log kinds in the local store spec.
- DevEx: Added unit tests for the queue, the API client, the upload, and adoption against a fake service.
- DevEx: Added unit tests for the merge, the pull, the sync log, and the engine against a fake change feed with two devices.
- Docs: Added the NTF-1 to NTF-7 requirements and the Inbox design, and moved the inbox out of Planned After v1.0.0.
- DevEx: Added unit and end-to-end tests for the update protocol of the worker, the Update toast, and the second-tab banner.
- DevEx: Added unit and end-to-end tests for the inbox client, the bell, the panel, and the banners.
- DevEx: Added end-to-end tests for rows taller than 48 px and for the first rows painting before the start-up maintenance.
- DevEx: Made the Import backup focus end-to-end test wait for the main column to wake, so it passes on slow CI runners.
- FrontEnd: Read the one-time passcode from the JSON answer of the sign-in callback, as the server sends it; the redirect of older servers still works.
- DevEx: Added the opt-in `npm run test:contract`, which runs the sync client against a real todos server named by `TODOS_SERVER_DIR`.
- Docs: Described the contract tests in the DevOps guide, and the JSON answer of the sign-in callback.
- FrontEnd: Queued the changes of a merge import while connected: a newer row sends all its fields without an edit time, an older row sends nothing.
- FrontEnd: Created only missing notes and added only missing memberships in a connected import, which never removes data or changes lists of other owners.
- FrontEnd: Turned Overwrite off in the Import backup dialog while connected, and kept the dialog open on Syncing and Synced until Done.
- FrontEnd: Passed the sync engine to Settings, so Sync and disconnect works.
- Docs: Described the connected import in the UI design and the backup format.
- DevEx: Added unit and end-to-end tests for the connected import, its queue entries, and the sync progress.
- FrontEnd: Added a sync indicator beside the user button with seven states: Local only, Synced, Syncing, Offline with the pending count, Sign in needed, Sync error, and Update required.
- FrontEnd: Added a sync popover with the last sync time, Sync now, Retry after an error, Check for update, and a Sync log link.
- FrontEnd: Showed a dot on the indicator for unseen sync log entries, and a banner with Sign in while the session is expired.
- FrontEnd: Built the Sync log screen with the entries of the last 30 days, newest first, and links to items that still exist.
- FrontEnd: Moved the Sign in button of an expired session from the top bar to the session banner, and added the sync state and Sync log link to Settings.
- Docs: Redrew the wireframes with the sync indicator in the top bar.
- FrontEnd: Remembered the view options of each list on its own, so Reset restores the defaults of that list only; the old option shared by every list is no longer read.
- FrontEnd: Sent a random state when signing in through Auth, and rejected a return whose state is missing or differs, to prevent login CSRF.

## v0.2.0 [released: 2026-11-07]
- FrontEnd: Made the add field also search All tasks and every list, with a 150 ms pause, a note under the rows, and no Add on Enter.
- FrontEnd: Renamed Add to Add anyway on an exact match, and showed a toast with Show when the view options hide a new task.
- FrontEnd: Removed the separate search field of All tasks, and made Escape clear the add field.
- FrontEnd: Made lists re-orderable on the device only, by drag handle, Alt+Up and Alt+Down, or Move up and Move down, in the sidebar and the Lists screen.
- FrontEnd: Added Edit view options to the More menus of All tasks and every list, opening a panel with Reset, filters, and sort.
- FrontEnd: Let All tasks group its tasks by List, Due date, or Status from the view options, with a count in each group header and a choice kept per device.
- FrontEnd: Added an info line under the add bar that names the task count, the active filters, and any other sort, with a Reset link.
- FrontEnd: Replaced the filter chips, the Sort menu, the list order buttons, and the status chip with the view options panel.
- FrontEnd: Renamed Share to Share list in the list More menu, and made the list view filter by due and created dates too.
- DevEx: Added `devops.py` with lint, test, e2e, check, and release actions that tag and publish versions.
- Docs: Specified how sync handles server errors, tab leadership, the version 4 store, and controlled updates, adding SYN-11, SYN-12, and TEC-19.
- FrontEnd: Required Create or Enter to save new lists; closing discards drafts while existing lists still save automatically.
- FrontEnd: Removed the sidebar New list action; list creation stays available through the Lists view floating plus.
- FrontEnd: Opened Import backup in the main view between the bars on phones, like the task and list editors.
- FrontEnd: Replaced the top-bar More button with a floating circular plus button, named New list, at the bottom right of the Lists view.
- FrontEnd: Moved the account, Recycle bin, and Settings behind a circular user button at the top right.
- FrontEnd: Added a Sign in button for expired sessions, and removed the shell's sync indicator for now.
- FrontEnd: Gave the In progress, Completed, and Cancelled status icons blue, green, and red colors, and struck through completed tasks.
- FrontEnd: Styled every Delete button and menu item with the danger color, filled for the editor and confirm buttons.
- DevEx: Made the due date end-to-end test independent of the browser locale, so it passes on Linux CI.
- Docs: Amended TEC-11 so the Cloud Run server hosts the app at the todos site root and Pages stays a bring-your-own-server copy.
- FrontEnd: Made the service worker leave /admin and /api alone, so /admin never falls back to the app shell.
- Docs: Designed a combined search and add field and side-panel view options with grouping, requirements VO-1 to VO-14.

## v0.1.0 [released: 2026-11-05]
- FrontEnd: Added an offline-first, installable web app that keeps lists, tasks, and notes in the browser.
- FrontEnd: Added All tasks with search, filters, sorting, and an add bar, plus the first-launch empty state.
- FrontEnd: Added the List screen with manual ordering by drag or keyboard and view-only sort orders.
- FrontEnd: Added task and list editors that save on change, with timestamped notes and a 30-day recycle bin.
- FrontEnd: Added overdue handling that cancels overdue tasks set to cancel automatically, also after the app was closed.
- FrontEnd: Added JSON backup export, and import in merge or overwrite mode with a preview of the changes.
- FrontEnd: Added Settings with theme selection, and a connect flow with sign-in and disconnect through the Auth service.
- FrontEnd: Added a monochrome design system with a navy signal color, a danger color, and a visual style gallery.
- FrontEnd: Made long lists fast by rendering only visible rows, so views open within 200 ms throttled.
- Build: Added the npm tooling, a static dev server, and a GitHub Pages workflow with a precache version check.
- Docs: Wrote the requirements, the UI design with wireframes, the visual style guide, and the store and backup specs.
