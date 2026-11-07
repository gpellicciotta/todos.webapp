# Changelog
All notable changes to this project are documented here.

> See [change management guidelines](https://github.com/gpellicciotta/dev-guidelines/blob/main/guidelines/change-management-guidelines.md)
> for the versioning and changelog conventions used across projects.

## v0.2.0-pre
- FrontEnd: Made the add field also search All tasks and every list, with a 150 ms pause, a note under the rows, and no Add on Enter.
- FrontEnd: Renamed Add to Add anyway on an exact match, and showed a toast with Show when the view options hide a new task.
- FrontEnd: Removed the separate search field of All tasks, and made Escape clear the add field.
- FrontEnd: Made lists re-orderable on the device only, by drag handle, Alt+Up and Alt+Down, or Move up and Move down, in the sidebar and the Lists screen.
- FrontEnd: Added Edit view options to the More menus of All tasks and every list, opening a panel with Reset, filters, and sort.
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
