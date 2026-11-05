# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## v0.2.0 Milestone
- [ ] T0055 [needs: T0054] Make the add field also search, with Add anyway, a hidden-task toast, and Add-only creation.
- [ ] T0054 Build the View options panel, the More menu entries, and the info line for All tasks and list views.
- [x] T0045 Exclude /admin and /api from service worker navigation fallback and caching.
- [x] T0044 Amend TEC-11: the Cloud Run server hosts the app at the todos site root, Pages stays a bring-your-own-server copy.
- [ ] T0046 Make lists re-orderable in the front-end only, without back-end storage.
- [ ] T0047 Create a new list only when the Create button is clicked, not when the dialog is closed.
- [ ] T0048 [needs: T0054] Let the All tasks dashboard group tasks by List, Due Date, or Status.
- [ ] T0049 Replace the + New List button with a subtle (+) button next to the Lists header.
- [ ] T0050 Style all Delete buttons with the danger color.
- [x] T0051 Design a more subtle, less intrusive UI for searching, filtering, and grouping.
- [ ] T0052 Use blue, green, and gray for the In progress, Completed, and Cancelled status icons.

## v0.3.0 Milestone
- [ ] T0025 Build sync upload: the change queue, first-connect adoption of local data, and rollback of rejected changes.
- [ ] T0026 [needs: T0025] Build sync download: the change feed client, per-field merge, lost access handling, and the sync log store.
- [ ] T0027 [needs: T0026] Show every sync state in the sync indicator and build the Sync log screen.
- [ ] T0028 [needs: T0026] Add the Sharing section to the list editor, role-aware controls, and the Shared filter.
- [ ] T0043 Speed up the cold launch toward TEC-16, smooth throttled scrolling, and support rows taller than 48 px in long lists.

## Backlog
- [ ] T0053 Remember view options per list instead of one shared setting, with a reset to the shared defaults.
- [ ] T0004 Show service broadcasts and the notification inbox while connected.
