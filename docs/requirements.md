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
- **Task:** A piece of work with a description, lifecycle rules, occurrences, and events.
- **Lifecycle rules:** A task's goal, start time, due time, overdue behavior, and recurrence.
- **Goal:** What counts as achieved in a window: Check, or at least or at most a target of a measure.
- **Entry:** One `log` event: a check, time spent, an amount, or a mix, with an optional label.
- **Occurrence:** One run of a task; the current occurrence holds the task's status and due time.
- **Event:** An action on a task, such as `log`, `undo-log`, or `cancel`; events decide the status.
- **Membership:** The link between a task and one list, holding the task's position in that list.
- **Note:** A timestamped text entry attached to one task.
- **Owner:** The creator of a list or task; in local mode, the single local user.
- **Last update time:** The latest change to a task, its rules, events, memberships, or notes.
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
- LST-8: Users reorder lists by drag or keyboard, in the sidebar and the Lists screen.
  New lists append at the end. The order is the user's own setting and syncs as `SYN-13` describes.
  Collaborators keep their own order; the store and the sync feed never hold it.
- LST-9: Each row of the Lists screen has a More button with the actions of the list view: edit, view options, share, and delete.
- LST-10: From 12 lists, the sidebar and the Lists screen offer a find field that filters lists by typed text.
  It ignores case and accents, matches names (the Lists screen also descriptions), and states how many lists match.
- LST-11: A find with no match on the Lists screen offers to create a list with the typed name.
- LST-12: Users sort the Lists screen by manual order, name, open task count, or last update.
  The app remembers the choice, which syncs as `SYN-13` describes.
  Sorting and finding never change the stored order, and reordering is available only in manual order without find text.
- LST-13: Users move a list to the top or bottom, besides moving it by one place, by menu entry or keyboard.
- LST-14: The wide sidebar keeps All tasks, Lists, and the find field in view, and scrolls only the lists.
  It keeps the current list in view and never moves its scroll on a count change.
- LST-15: The sidebar and the Lists screen are each one tab stop, with arrow, Home, End, and Page keys between lists.
  A shortcut focuses the find field, and a polite announcement states the match count after each change.
- LST-16: When connected, users show only shared lists on the Lists screen.

### Tasks
- TSK-1: Users create a task with a description of 1 to 500 characters.
- TSK-2: A new task has status `ready`, the goal Check, and overdue behavior `keep` unless the user picks otherwise.
- TSK-3: A task status is one of `ready`, `in-progress`, `completed`, `failed`, or `cancelled`.
  Only a closed window is `failed`; `cancelled` means that a user dropped the task.
- TSK-4: What users log decides a task status, through events offered only while their preconditions hold.
  One click on a row's status button logs a check for Check and checks goals, and never lowers the count.
  It does nothing once cancelled, failed, or completed at target 1; above target 1 the count may pass the target.
  For time, amount, and reading goals, the click opens the quick log instead (`TSK-21`).
  Every logged check shows an Undo toast; the row offers no other status action.
  The editor's Status tab shows the status as text, with no button per status.
  It offers Check off, a stepper for checks goals, Mark started, and Reopen for a failed "at least" task.
  Cancel task and Uncancel sit in the Danger zone of the Configuration tab.
- TSK-5: Users set, change, or clear an optional due time.
- TSK-6: A due date without a time of day means 23:59 local time on that date.
- TSK-7: Users set the overdue behavior to `keep` or `fail` on an "at least" task with a due time.
- TSK-8: Users add a task to one or more lists and remove it from any of them, in the task editor.
- TSK-9: A task created inside a list view starts as a member of that list.
- TSK-10: A task in no list stays visible in the task view.
- TSK-11: Deleting a task, from the editor's Danger zone, moves it to the recycle bin and hides it everywhere.
- TSK-12: Every task records its creation time and last update time, which every change of it or its parts moves.
- TSK-13: A task added from the add field opens in the editor on a wide screen; the field keeps the focus.
  A compact screen opens no editor, so tasks can be added in a row.
- TSK-14: A due date, a time, and list tags typed in the add field set the new task's due time and lists.
  A preview line under the field names what the add will set; the parser works offline, in US English.
- TSK-15: Users set a task's goal: Check, At least, or At most a target of a measure.
  The measure counts checks, sums time spent or amounts, or takes the latest reading.
  Checks and time targets are whole numbers from 1 to 999,999,999,999.
  Amount and reading targets run from 0 to 999,999,999,999.999, with up to 3 decimals and a unit of 20 characters.
  An "at most" goal needs a due time or a recurrence.
  Above target 1, rows show a checks goal's counts as a badge on the status icon, such as `2/3`.
- TSK-16: Users make a task recur daily, weekly, monthly, or yearly, every 1 to 99 units, in an IANA timezone.
  A recurrence may end on a date or after a number of periods; a recurring task comes back as to do each period.
  Rows show the repeat text, such as "Weekly", on the meta line; past its period end a task shows as to do until it rolls over.
  For 24 hours after a period ends, users can still complete that period from the editor's Status tab.
- TSK-18: The task editor groups its fields in four tabs: Status, Notes, Configuration, and History.
  Status holds the status, progress, Log form, and entries; Notes holds the notes.
  Configuration holds the description, lists, goal, recurrence, time window, and Danger zone.
  It opens on Status.
- TSK-19: A task row shows a status button, its description, and a meta line with the due or repeat text on the left and the lists on the right.
  Overdue due text uses the danger color and stays as text; a row has no menu or More button.
  Goal rows add a meter and their progress, and failed rows say Failed (`TSK-22`).
- TSK-20: Users set an optional start time; before it, a task is upcoming and takes no events.
  The start time lies before the due time and the recurrence end.
  It changes only while period 1 is the only period, open, and free of user events.
- TSK-21: Users log entries: a check, time spent, an amount, or a mix, with an optional label of 100 characters.
  The editor lists the current period's entries, each with Undo; logging above 12 hours asks first.
- TSK-22: Rows and the editor show progress against the goal, and whether the task is on track.
  "Approaching" starts at 80% of the target: yellow for "at least" goals, orange for "at most" goals.
  A reached "at least" target turns green; an "at most" overage shows in orange with an alert icon.
  Red marks Failed only; in progress shows orange when not on track, judged by the share of the window gone.
- TSK-17: Users see a task's history: its occurrences and events, newest first.
  It reads the server while connected, and the local stores in local mode.

### Notes
- NOT-1: Users add notes to a task; each note holds 1 to 2000 characters of plain text.
- NOT-2: Each note records its creation time, its last edit time, and, when connected, its author.
- NOT-3: A task shows its notes in creation order, newest first.
- NOT-4: Users edit or delete their own notes.
- NOT-5: Adding, editing, or deleting a note updates the task's last update time.
- NOT-6: A note belongs to the whole task or to one occurrence; users change that link when editing.
  A new note on a recurring task belongs to the occurrence of its creation time.
  A new note on a one-off task is global.
  A task shows its global notes, then its linked notes; the history shows each occurrence's notes.

### Overdue Handling
- OVD-1: A task is overdue when its due time has passed and its status is `ready` or `in-progress`.
- OVD-2: Views mark overdue tasks visibly.
- OVD-3: An overdue task with behavior `keep` stays open and keeps its overdue mark.
- OVD-4: An overdue task with behavior `fail` expires to `failed` within one minute while the app is open.
  An "at most" task gets its verdict at its due time: `completed` within its limit, else `failed`.
  A reading goal without any reading, its own or carried, ends `failed`; recurring periods close the same way.
- OVD-5: On start, the app expires every task that became overdue with behavior `fail` while it was closed.
- OVD-6: Overdue handling never changes deleted, `completed`, `failed`, or `cancelled` tasks.

### Reminders
- REM-1: Reminders are off by default; Settings turns them on, which asks the browser for notification permission from the click.
- REM-2: A denied or unsupported permission leaves reminders off and tells the user why.
- REM-3: The lead time is at the due time, or 5, 15, 30, or 60 minutes before; the device remembers the choice.
- REM-4: While the app is open in any tab, an open, undeleted task notifies once when its reminder time arrives; a task due on a date only (23:59) notifies at 09:00 that day.
- REM-5: The notification shows the task description and its due time in the device timezone, and a repeat replaces it instead of stacking.
- REM-6: Clicking a notification focuses an open app window, or opens one, and opens the task editor.
- REM-7: A due time notifies once, also after a reload; a changed due time arms again, and completing, cancelling, or deleting the task, or clearing its due time, cancels it.
- REM-8: A recurring task reminds once per occurrence; the roll-over arms the next occurrence.
- REM-9: Only one tab schedules (`SYN-12`), and in local mode reminders send no network request (`LOC-3`).
- REM-10: On start, reminders that came due while the app was closed, since reminders turned on, show as one summary notification.
- REM-11: While connected, with reminders on and notification permission granted, the device subscribes to Web Push and registers the subscription with the service, with the lead time and a device name; local mode registers nothing (`LOC-3`).
- REM-12: A pushed reminder shows while every tab is closed, with the task description and its due time, up to 4 hours before the local reminder time; its tag matches the local reminder of the same due time, so one replaces the other instead of stacking, and clicking it opens the task (`REM-6`).
- REM-13: Turning reminders off, disconnecting, and signing out unsubscribe the browser and delete the registration; an expired session unsubscribes the browser, and the service drops the registration once its push service reports the subscription gone.
- REM-14: A change of the lead time updates the registration. Settings says when the service cannot push or the browser cannot receive pushes, and that an iPhone or iPad needs ToDo's on the Home Screen.

### List View
- LV-1: The list view shows all tasks of one list, with the list name and description.
- LV-2: The list view shows tasks in the list's manual order by default.
- LV-3: Users reorder tasks by pressing and dragging, by a long hold on touch, and by the Alt+arrow, Alt+Home, and Alt+End keys.
- LV-4: Each list keeps its own manual order; reordering one list leaves other lists unchanged.
- LV-5: A task added to a list goes after its last task.
- LV-6: Users sort the view by manual order, due time, creation time, last update time, status, or description.
- LV-7: A sort other than manual order affects the current view only and never changes the stored manual order.
- LV-8: Choosing manual order restores it; manual reordering is unavailable while another sort or a grouping is active.
- LV-9: Users create, edit, change status of, and delete tasks directly in the list view.
- LV-10: The list view filters by status, showing tasks of every status by default.
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
- TV-9: Users order by due time, creation time, last update time, status, or description, ascending or descending.
  Grouped by list, users also order each list group by the manual order of its list.
- TV-10: Tasks without a due time sort last in both directions when ordering by due time.
- TV-11: Users create, edit, change status of, and delete tasks directly in the task view.
- TV-12: The app remembers the last used filters, grouping, and order, for All tasks and for each list on its own.
  They sync as `SYN-13` describes.
- TV-13: The task view orders by creation time, newest first, until the user picks another order.
- TV-14: Users limit the completed, failed, and cancelled tasks they see to those finished today.
  A task finished when its current occurrence closed.
- TV-15: While Show upcoming is on, views show tasks starting within 24 hours in a group at the end.
  Show upcoming is on by default; tasks that start later stay hidden.

### View Options
- VO-1: The task view and the list view share one set of options for search, filter, group, and sort.
- VO-2: At rest the view shows the search and add field, plus a subtle line on wide layouts.
- VO-3: Typing in the field filters the view to matching tasks; Add, its shortcuts, or Enter create a task.
  A setting turns Enter adding off, so Enter only searches; it syncs as `SYN-13` describes.
- VO-4: The More menu of the task view and of each list view offers "Edit view options".
- VO-5: View options open in the side panel on wide layouts and as a full screen on compact layouts.
- VO-6: View options hold every filter, the grouping choice, the sort choice, and a Reset button.
- VO-7: The subtle line, shown on wide layouts only, names the task count, active filters, grouping, and non-default sort.
- VO-8: Reset, in the panel or on the subtle line of wide layouts, restores every option to its default.
- VO-9: Users group the view by list, due date, or status, or not at all; the task view offers all three.
- VO-10: A group shows its name and its task count; search, filters, and sort apply inside each group.
  While search or filters hide tasks of a group, the count reads shown of total, such as "6 of 10".
- VO-11: A task in several lists appears in each of its list groups; tasks in no list form the last group.
- VO-12: Groups appear in a fixed order: lists as arranged, due dates from overdue to none, statuses as listed.
  Empty groups are left out, and group headers take no part in selection.
- VO-13: Every control works by keyboard, and a polite announcement states the task count after each change.
- VO-14: A user who cannot add tasks to the view sees the field as search only, without an Add button.
- VO-15: Users collapse and expand each group from its header, by pointer or keyboard, while the view is open.

### Recycle Bin
- BIN-1: The recycle bin lists deleted lists and tasks with their deletion time and days left.
- BIN-2: Users restore a deleted list or task within 30 days of its deletion.
- BIN-3: Restoring a list or task brings back all of its memberships.
- BIN-4: Users delete a recycle bin entry permanently after confirming; while connected, it is deleted for the account on every device.
- BIN-5: Entries deleted more than 30 days ago are purged permanently.
- BIN-6: Deleted tasks accept no edits until restored.
- BIN-7: Users empty the recycle bin after confirming, which permanently deletes every entry in it; while connected, it empties the account's bin on every device.
- BIN-8: Users filter the recycle bin by typed text and by type: all, lists, or tasks.
- BIN-9: Users restore, or permanently delete after confirming, every entry that matches the recycle bin filter.

### Backup and Restore
- BAK-1: Users export a backup of all stored data as one JSON file, in both modes.
- BAK-2: A backup holds lists, tasks, memberships with positions, notes, and recycle bin entries.
  It also holds each task's lifecycle rules, occurrences, and events.
- BAK-3: A backup records a format version, the app version, and the export time.
  Import also reads backups of the previous format version.
- BAK-4: The backup file name is `todos-backup-{{yyyy-mm-dd}}.json`.
- BAK-5: Users import a backup in merge mode or overwrite mode.
- BAK-6: Merge mode matches lists, tasks, and notes by identifier; the most recently updated version wins.
  A task that merges in also adds the imported events by identifier, and never removes events.
- BAK-7: Merge mode adds missing memberships at the end of each list and keeps existing positions.
- BAK-8: Overwrite mode replaces all data the user owns with the backup contents.
- BAK-9: Overwrite mode moves owned lists and tasks missing from the backup to the recycle bin.
- BAK-10: When connected, import never changes lists owned by other users, nor tasks in them.
- BAK-11: Before applying an import, the app shows counts of added, updated, and binned items.
- BAK-12: The user confirms or cancels an import; cancelling changes nothing.
- BAK-13: An invalid or unsupported file changes nothing and reports the reason.
- BAK-14: An exported backup re-imported in overwrite mode reproduces the same data.
- BAK-15: Users erase all data on this device after typing DELETE, with an offer to export a backup first; while connected it also erases the lists, tasks, and notes the user owns from the account, queued while offline. In local mode the erase reaches the account on the next connect: automatically for the account this device was last connected to, otherwise only if the user agrees.

### Connecting
- CON-1: Users connect from the settings by signing in through the Auth service.
- CON-2: The app explains, before sign-in, that connecting needs an account and gives up anonymity.
- CON-3: A sign-in by a user without an invitation shows that access is by invitation only.
- CON-4: On first connect, the app uploads all local lists, tasks, memberships, and notes to the account. A pending local erase (`BAK-15`) runs first.
- CON-5: A local list whose name matches an account list merges into it, keeping both sets of tasks.
- CON-6: After connecting, the app downloads all data the account can see.
- CON-7: Users disconnect from the settings; the app then returns to local mode.
- CON-8: Disconnecting keeps the user's own lists and tasks as local data.
- CON-9: Disconnecting removes lists owned by other users, with their tasks owned by others.
- CON-10: Disconnecting with unsynced changes warns the user and offers to sync first.
- CON-11: Version 1.0.0 connects to one account and one server at a time.
- CON-12: The server URL defaults to the production service and can be changed in the settings.
- CON-13: An expired session keeps the app usable, queues changes, and asks the user to sign in again.
- CON-14: While connected, Delete account marks the account for deletion on the service, then disconnects and keeps the local data.

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
- SYN-13: While connected, the user's settings follow the account to every device, and the latest change wins.
  They cover the view options (`TV-12`), the list order (`LST-8`), the Lists screen sort (`LST-12`), and Enter adding (`VO-3`).
  The server URL, the theme, and panel widths stay on the device; in local mode, every setting stays on the device.
  The manual order of tasks in a list is list data, shared with collaborators and synced like other changes (`LV-4`).

### Notifications
- NTF-1: While connected, a bell button opens an inbox of the account's notifications and service broadcasts, most recent first.
- NTF-2: The bell shows the unread count, and appears only while connected.
- NTF-3: A notification marked as a banner shows above every view until the user dismisses it; dismissing marks it read.
- NTF-4: Users mark a notification read, discard it, or discard all; each change waits for the service.
- NTF-5: The inbox loads at start, on sign-in, when the tab becomes visible, and every 2 minutes while visible.
- NTF-6: Offline, the inbox keeps its last notifications and says so; local mode and an expired session send no inbox request.
- NTF-7: A notification's action link opens only when it is an http or https address.

### Sharing
- SHR-1: A list owner shares a list with an email address and a role: `viewer`, `task-editor`, or `editor`.
- SHR-2: A list owner sees, changes, and revokes the sharing rules of the list.
- SHR-3: Shared lists show their owner and the user's own role.
- SHR-4: The UI offers only the actions the user's role on a list or task allows.
- SHR-5: Role permissions follow the service's business logic spec.
- SHR-6: Sharing actions need a network connection and are disabled while offline.
- SHR-7: Edits to shared lists made offline queue and sync like other changes.
- SHR-8: A user who loses access to a shared list no longer sees it after the next sync.

### Help
- HLP-1: The user menu has a Help item, after Settings, that opens the Help screen at `#/help`.
- HLP-2: Help shows Application Info & Support, Welcome to ToDo's, Getting Started Tutorial, FAQ, and Release notes, in this order.
- HLP-3: A search field and topic chips filter the panels, a search opens the FAQ entries that match, and `#/help?q=` and `#/help?topic=` links set the filters.
- HLP-4: The docs and the changelog load when Help opens, a failed file offers Retry in its own panel, and Help works offline after one visit.

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
- TEC-16: Views open within 200 ms with 150 lists and 5000 tasks on a mid-range phone.
- TEC-17: The app sends no analytics or tracking data.
- TEC-18: Signing out or disconnecting deletes the session token from the device.
- TEC-19: A new app version installs only when the user chooses Update, so open tabs never mix old and new code.

---

## Planned After v1.0.0
Version 1.0.0 leaves these out; later versions add them:
- Several accounts or servers on one device, each with its own data set and sync state.

Designs for v1.0.0 must not block these additions, for example by assuming one global data set.

---

## Out of Scope
- The admin console, which stays outside this project.
- CSV export and import; the JSON backup covers data portability.
- Account profile management, which stays in the Auth service.

---

## Service Dependencies
Connected mode needs these service changes beyond the current REST API spec:
- Task notes: a notes resource with identifiers, text, owner, and creation and last update times.
- Last update time: a task field covering field, rule, event, membership, and note changes.
- Lifecycle rules, occurrences, and events: the task shape and event route of todos task T0241.

- Sync protocol: a change feed, tombstones, and revisions, planned in todos tasks T0136 to T0140.
- Per-field merge: updates that carry only changed fields and resolve same-field conflicts by edit time.
- Local data adoption: first-connect upload, including merging lists with matching names.
