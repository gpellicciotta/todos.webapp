# Requirements
Functional and technical requirements for the ToDo's web app.
Each requirement has a stable identifier, such as `TSK-3`, for tests, designs, and tasks to cite.
The [ToDo's service REST API spec](https://github.com/gpellicciotta/todos/blob/main/docs/specs/rest-api-spec.md) defines the backend side.

---

## Purpose and Modes
The app is a personal todo list and task manager that works fully offline.
It runs in one of two modes:
- Local mode: the default; no account, no login, and all data stays in the browser.
- Connected mode: opt-in; the user signs in to the ToDo's service, which then holds the data centrally.

Connected mode adds two capabilities:
- The same data on every device of the user.
- Lists shared with other users, who then see or work on the same tasks.

Connected mode costs anonymity: it requires a login, and the service admits invited users only.

---

## Glossary
- **List:** A named tag on tasks, with an optional description; the unit of sharing.
- **Task:** A piece of work with a description, a status, and an optional due time.
- **Membership:** The link between a task and one list, holding the task's position in that list.
- **Note:** A timestamped text entry attached to one task.
- **Owner:** The creator of a list or task; in local mode, the single local user.
- **Last activity time:** The latest change to a task, its memberships, or its notes.
- **Backup:** A single file holding all data the app stores.

---

## Functional Requirements

### Local Mode
- LOC-1: A first visit opens the app in local mode without any account, login, or setup step.
- LOC-2: Every feature except connecting, syncing, and sharing works in local mode.
- LOC-3: Local mode sends no network request other than loading the app's own files.
- LOC-4: Local data survives closing the browser, reloading, and restarting the device.
- LOC-5: Each browser profile holds one independent local data set.

### Lists
- LST-1: Users create a list with a name of 1 to 100 characters and an optional description.
  Create or Enter in the name field saves the draft; closing with Escape or the close button discards it.
- LST-2: A list description holds at most 1000 characters.
- LST-3: List names are unique per owner, compared case-insensitively; a duplicate name is rejected with a message.
- LST-4: Users rename a list and edit its description.
  Changes to existing lists save automatically.
- LST-5: Users see all lists with their task count, their open task count, and, when connected, their sharing state.
- LST-6: Deleting a list moves it to the recycle bin and never deletes its tasks.
- LST-7: A deleted list's tasks stay in their other lists, or end up in no list.
- LST-8: Users reorder lists by drag or keyboard, in the sidebar and the Lists screen; the order stays on the device.
  New lists append at the end; the store and the sync feed never hold the order.
- LST-9: Each row of the Lists screen has a More button with the actions of the list view: edit, view options, share, and delete.

### Tasks
- TSK-1: Users create a task with a description of 1 to 500 characters.
- TSK-2: A new task has status `todo` and overdue behavior `keep` unless the user picks otherwise.
- TSK-3: A task status is one of `todo`, `in-progress`, `completed`, or `cancelled`.
- TSK-4: Users change a task status from any status to any other status.
- TSK-5: Users set, change, or clear an optional due time.
- TSK-6: A due date without a time of day means 23:59 local time on that date.
- TSK-7: Users set the overdue behavior to `keep` or `cancel` on a task with a due time.
- TSK-8: Users add a task to one or more lists and remove it from any of them.
- TSK-9: A task created inside a list view starts as a member of that list.
- TSK-10: A task in no list stays visible in the task view.
- TSK-11: Deleting a task moves it to the recycle bin and hides it from every list and view.
- TSK-12: Every task records its creation time, last update time, and last activity time.
- TSK-13: A task created from the add field opens in the task editor.

### Notes
- NOT-1: Users add notes to a task; each note holds 1 to 2000 characters of plain text.
- NOT-2: Each note records its creation time, its last edit time, and, when connected, its author.
- NOT-3: A task shows its notes in creation order, newest first.
- NOT-4: Users edit or delete their own notes.
- NOT-5: Adding, editing, or deleting a note updates the task's last activity time.

### Overdue Handling
- OVD-1: A task is overdue when its due time has passed and its status is `todo` or `in-progress`.
- OVD-2: Views mark overdue tasks visibly.
- OVD-3: An overdue task with behavior `keep` stays open and keeps its overdue mark.
- OVD-4: An overdue task with behavior `cancel` changes to `cancelled` within one minute while the app is open.
- OVD-5: On start, the app cancels every task that became overdue with behavior `cancel` while it was closed.
- OVD-6: Overdue handling never changes deleted, `completed`, or `cancelled` tasks.

### List View
- LV-1: The list view shows all tasks of one list, with the list name and description.
- LV-2: The list view shows tasks in the list's manual order by default.
- LV-3: Users reorder tasks by dragging, and by keyboard move-up and move-down actions.
- LV-4: Each list keeps its own manual order; reordering one list leaves other lists unchanged.
- LV-5: A task added to a list goes after its last task.
- LV-6: Users sort the view by manual order, due time, creation time, last activity time, status, or description.
- LV-7: A sort other than manual order affects the current view only and never changes the stored manual order.
- LV-8: Choosing manual order restores it; manual reordering is unavailable while another sort or a grouping is active.
- LV-9: Users create, edit, change status of, and delete tasks directly in the list view.
- LV-10: The list view filters by status, hiding `completed` and `cancelled` tasks by default.
- LV-11: The list view uses the view controls and offers every filter except list, and grouping by due date or status.

### Task View
- TV-1: The task view shows all non-deleted tasks across all lists, including tasks in no list.
- TV-2: Users filter by list, including "in no list", selecting one or more lists.
- TV-3: Users filter by status, selecting one or more statuses.
- TV-4: Users filter by due date range, overdue state, or absence of a due time.
- TV-5: Users filter by creation date range.
- TV-6: Users filter by text contained in the description or the notes.
- TV-7: When connected, users filter by shared or not shared.
- TV-8: Filters combine with AND; each filter with several values matches any of them.
- TV-9: Users order by due time, creation time, last activity time, status, or description, ascending or descending.
- TV-10: Tasks without a due time sort last in both directions when ordering by due time.
- TV-11: Users create, edit, change status of, and delete tasks directly in the task view.
- TV-12: The app remembers the last used filters, grouping, and order per device.
- TV-13: The task view orders by creation time, newest first, until the user picks another order.

### View Options
- VO-1: The task view and the list view share one set of options for search, filter, group, and sort.
- VO-2: At rest the view shows only the search and add field and a subtle line of active filters and task count.
- VO-3: Typing in the field filters the view to matching tasks; only the Add button creates a task from the text.
- VO-4: The More menu of the task view and of each list view offers "Edit view options".
- VO-5: View options open in the side panel on wide layouts and as a full screen on compact layouts.
- VO-6: View options hold every filter, the grouping choice, the sort choice, and a Reset button.
- VO-7: The subtle line names the task count, each active filter, any grouping, and any sort other than the default.
- VO-8: Reset, in the panel or on the subtle line, restores every option to its default.
- VO-9: Users group the view by list, due date, or status, or not at all; the task view offers all three.
- VO-10: A group shows its name and its task count; search, filters, and sort apply inside each group.
- VO-11: A task in several lists appears in each of its list groups; tasks in no list form the last group.
- VO-12: Groups appear in a fixed order: lists as arranged, due dates from overdue to none, statuses as listed.
  Empty groups are left out, and group headers take no part in selection.
- VO-13: Every control works by keyboard, and a polite announcement states the task count after each change.
- VO-14: A user who cannot add tasks to the view sees the field as search only, without an Add button.

### Recycle Bin
- BIN-1: The recycle bin lists deleted lists and tasks with their deletion time and days left.
- BIN-2: Users restore a deleted list or task within 30 days of its deletion.
- BIN-3: Restoring a list or task brings back all of its memberships.
- BIN-4: Users delete a recycle bin entry permanently after confirming.
- BIN-5: Entries deleted more than 30 days ago are purged permanently.
- BIN-6: Deleted tasks accept no edits until restored.

### Backup and Restore
- BAK-1: Users export a backup of all stored data as one JSON file, in both modes.
- BAK-2: A backup holds lists, tasks, memberships with positions, notes, and recycle bin entries.
- BAK-3: A backup records a format version, the app version, and the export time.
- BAK-4: The backup file name is `todos-backup-{{yyyy-mm-dd}}.json`.
- BAK-5: Users import a backup in merge mode or overwrite mode.
- BAK-6: Merge mode matches lists, tasks, and notes by identifier; the most recently updated version wins.
- BAK-7: Merge mode adds missing memberships at the end of each list and keeps existing positions.
- BAK-8: Overwrite mode replaces all data the user owns with the backup contents.
- BAK-9: Overwrite mode moves owned lists and tasks missing from the backup to the recycle bin.
- BAK-10: When connected, import never changes lists owned by other users, nor tasks in them.
- BAK-11: Before applying an import, the app shows counts of added, updated, and binned items.
- BAK-12: The user confirms or cancels an import; cancelling changes nothing.
- BAK-13: An invalid or unsupported file changes nothing and reports the reason.
- BAK-14: An exported backup re-imported in overwrite mode reproduces the same data.

### Connecting
- CON-1: Users connect from the settings by signing in through the Auth service.
- CON-2: The app explains, before sign-in, that connecting needs an account and gives up anonymity.
- CON-3: A sign-in by a user without an invitation shows that access is by invitation only.
- CON-4: On first connect, the app uploads all local lists, tasks, memberships, and notes to the account.
- CON-5: A local list whose name matches an account list merges into it, keeping both sets of tasks.
- CON-6: After connecting, the app downloads all data the account can see.
- CON-7: Users disconnect from the settings; the app then returns to local mode.
- CON-8: Disconnecting keeps the user's own lists and tasks as local data.
- CON-9: Disconnecting removes lists owned by other users, with their tasks owned by others.
- CON-10: Disconnecting with unsynced changes warns the user and offers to sync first.
- CON-11: Version 1.0.0 connects to one account and one server at a time.
- CON-12: The server URL defaults to the production service and can be changed in the settings.
- CON-13: An expired session keeps the app usable, queues changes, and asks the user to sign in again.

### Sync
- SYN-1: While connected, every change applies locally first and syncs to the service in the background.
- SYN-2: Changes made offline while connected queue and sync once the network returns.
- SYN-3: Changes from other devices and collaborators appear without a page reload.
- SYN-4: The app shows the sync state: synced, syncing, offline with pending changes, or error.
- SYN-5: Concurrent edits to different fields of one task or list both survive.
- SYN-6: Concurrent edits to the same field keep the most recent edit, without asking the user.
- SYN-7: Notes never conflict, since each note is a separate entry.
- SYN-8: A sync log lists the values that conflict resolution overwrote, for the last 30 days.
- SYN-9: A change the service rejects is reverted locally and reported to the user.
- SYN-10: Repeating a sync after an interruption creates no duplicate lists, tasks, or notes.
- SYN-11: When the service refuses the app's version or speaks a newer sync protocol, syncing stops and the app asks for an update.
- SYN-12: Several open tabs sync as one: a single tab uploads changes and polls the service.

### Sharing
- SHR-1: A list owner shares a list with an email address and a role: `viewer`, `task-editor`, or `editor`.
- SHR-2: A list owner sees, changes, and revokes the sharing rules of the list.
- SHR-3: Shared lists show their owner and the user's own role.
- SHR-4: The UI offers only the actions the user's role on a list or task allows.
- SHR-5: Role permissions follow the service's business logic spec.
- SHR-6: Sharing actions need a network connection and are disabled while offline.
- SHR-7: Edits to shared lists made offline queue and sync like other changes.
- SHR-8: A user who loses access to a shared list no longer sees it after the next sync.

---

## Technical Requirements

### Platform
- TEC-1: The app is an installable Progressive Web App that starts and runs without network.
- TEC-2: The app supports the latest two versions of Chrome, Edge, Firefox, and Safari.
- TEC-3: The app supports desktop, Android, and iOS devices, from 360 px wide screens up.
- TEC-4: The app stores data in IndexedDB.
- TEC-5: The app asks the browser for persistent storage to protect local data from eviction.

### Implementation
- TEC-6: The app uses native ES modules, HTML, and CSS, with no UI framework.
- TEC-7: The app needs no build step; the repository files are the deployed files.
- TEC-8: The app uses a new design system, or reuses the [family-portal](https://github.com/gpellicciotta/family-portal) design system.
- TEC-9: Clients generate UUIDv7 identifiers for lists, tasks, and notes.
- TEC-10: The REST API is the only contract between the app and the service.

### Hosting and Language
- TEC-11: The Cloud Run server hosts the app at `https://todos.pellicciotta.com/`, so the app and its API share one origin.
  GitHub Pages at `https://gpellicciotta.github.io/todos.webapp/` stays a bring-your-own-server copy with a configurable server URL.
- TEC-12: The UI is in US English.
- TEC-13: All UI strings live in one module, so translations can follow.
- TEC-14: The app shows times in the device timezone.

### Quality
- TEC-15: The UI meets WCAG 2.2 level AA and is fully operable by keyboard.
- TEC-16: Views open within 200 ms with 5000 tasks on a mid-range phone.
- TEC-17: The app sends no analytics or tracking data.
- TEC-18: Signing out or disconnecting deletes the session token from the device.
- TEC-19: A new app version installs only when the user chooses Update, so open tabs never mix old and new code.

---

## Planned After v1.0.0
Version 1.0.0 leaves these out; later versions add them:
- Several accounts or servers on one device, each with its own data set and sync state.
- Service broadcasts and the notification inbox.

Designs for v1.0.0 must not block these additions, for example by assuming one global data set.

---

## Out of Scope
- The admin console, which stays outside this project.
- CSV export and import; the JSON backup covers data portability.
- Account profile management, which stays in the Auth service.

---

## Service Dependencies
Connected mode needs these service changes beyond the current REST API spec:
- Task notes: a notes resource with identifiers, text, author, and creation and edit times.
- Last activity time: a task field covering field, membership, and note changes.
- Sync protocol: a change feed, tombstones, and revisions, planned in todos tasks T0136 to T0140.
- Per-field merge: updates that carry only changed fields and resolve same-field conflicts by edit time.
- Local data adoption: first-connect upload, including merging lists with matching names.
