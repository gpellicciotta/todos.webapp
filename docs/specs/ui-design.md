# UI Design
Screens, navigation, and key flows of the ToDo's web app.
It implements [requirements.md](../requirements.md), citing requirement identifiers such as `LV-7`.
The [visual-style-guide.md](visual-style-guide.md) defines the look; this document defines structure and behavior.

---

## Design Principles
- Content first: task descriptions carry the screen; chrome stays quiet and monochrome.
- Instant: every change applies locally at once, with no Save buttons and no spinners for local work.
- Same app in both modes: connected mode adds controls but never moves or renames existing ones.
- Forgiving: deletions go to the recycle bin, and a toast offers Undo.
- Honest sync: the sync indicator always tells whether data is only local, pending, or synced.
- Keyboard and touch parity: every drag, hover, or shortcut has a visible button alternative.

---

## Layout and Navigation

### Breakpoints
- Compact layout below 64rem (1024 px): one column, a top bar, and a bottom navigation bar.
- Wide layout from 64rem: a left sidebar, the main column, and an optional editor panel on the right.
- The editor panel holds the task editor or the list editor, never both at once.
- The main column caps its width, so task rows stay readable on 1440 px screens.

### Compact Layout
```text
+--------------------------------------+
| Title                  [sync] [more] |  top bar
+--------------------------------------+
| [search........] [Filters 2] [Sort]  |  view controls
+--------------------------------------+
| ( ) Buy paint            Tomorrow    |
| (/) Call plumber         Overdue  !  |  task rows
| ( ) Book flights                     |
|                                      |
+--------------------------------------+
| [Add a task...................] [+]  |  add bar
+--------------------------------------+
| Tasks    Lists    Bin    Settings    |  bottom navigation
+--------------------------------------+
```

### Wide Layout
```text
+--------------+-------------------------------+---------------------+
| ToDo's       | All tasks              [Sort] | Task or list editor |
|              | [search] [Lists] [Status] ... | Description         |
| All tasks 24 +-------------------------------+ Status              |
| Lists        | [Add a task.............] [+] | Due time            |
|  Home     8  | ( ) Buy paint      Tomorrow   | Lists               |
|  Work    12  | (/) Call plumber   Overdue !  | Notes               |
|  + New list  | ( ) Book flights              |                     |
|              |                               |                     |
| Recycle bin  |                               |                     |
| Settings     |                               |                     |
| [sync state] |                               |                     |
+--------------+-------------------------------+---------------------+
```

### Navigation Rules
- Destinations: All tasks, Lists, each single list, Recycle bin, and Settings.
- The compact bottom bar holds Tasks, Lists, Bin, and Settings; the wide sidebar holds the same plus every list.
- The sidebar lists each list with its open task count, and ends with a New list button.
- **[Decided]** Routes use the URL hash, such as `#/lists/{{list-id}}`, since GitHub Pages has no route rewrites.
- Back and forward buttons move between routes; opening the task editor adds a route.
- Each route restores its scroll position, filters, and sort (`TV-12`).

### App Shell
[app.js](../../src/js/app.js), [router.js](../../src/js/ui/router.js), and [layout.js](../../src/js/ui/layout.js) build the shell.
[app-shell.css](../../src/css/app-shell.css) places its parts; one DOM holds both layouts.
- The compact top bar holds the route title, the sync indicator, and a More menu with New list.
- The wide layout shows the title above the main column, and the sync indicator at the sidebar bottom.
- In local mode the sync indicator reads Local only and links to `#/connect`.
- The main column scrolls; the bars and the sidebar stay in place.
- Each route renders an empty `[data-view]` element, such as `data-view="tasks"`, in the main column.
  List views also carry `data-list-id`; the screen tasks fill these views.
  [all-tasks.js](../../src/js/views/all-tasks.js) fills `tasks`, [lists.js](../../src/js/views/lists.js) `lists`,
  [recycle-bin.js](../../src/js/views/recycle-bin.js) `bin`, [settings.js](../../src/js/views/settings.js) `settings`,
  and [connect.js](../../src/js/views/connect.js) `connect`; the others stay empty until their tasks land.
- A banner area above the view holds lasting notices, such as a newer version in another tab with Reload.
- Moving to another view moves focus to the main column, which the route title labels.
- Views: `tasks`, `lists`, `list`, `bin`, `settings`, `sync-log`, and `connect`.
- The `[data-editor-slot]` element names the open editor in `data-editor`: `task`, `list`, or empty.
  [editor-panel.js](../../src/js/views/editor-panel.js) mounts the editor of the route and unhides the slot.
  It covers the main column in compact layouts; an editor not built yet leaves the slot hidden.
- Editor routes keep their view, so opening an editor keeps the view's scroll and state.
- Scroll positions and a memory object are kept per view, for the session; it keeps the search text.
- Filters and sort persist per device in `localStorage`, such as `todos.view.tasks` (`TV-12`).
  [preferences.js](../../src/js/core/preferences.js) reads and writes these keys; blocked storage falls back to defaults.
- The page title reads "{{route title}} · ToDo's"; a list route shows the list name.
- On start the app opens the store, purges expired bin entries, then starts the overdue timer.
  The timer's first run cancels overdue `cancel` tasks.
- A start-up failure replaces the view with an error banner asking for a reload.
- The theme follows the system unless `localStorage` holds `todos.theme` as JSON `"light"` or `"dark"`.
  A stored theme also sets every `theme-color` meta, so the browser bar matches it.

### Routes
- `#/tasks`: all tasks.
- `#/tasks/{{task-id}}`: all tasks with the task editor open.
- `#/lists`: lists overview.
- `#/lists/{{list-id}}`: one list.
- `#/lists/{{list-id}}/tasks/{{task-id}}`: one list with the task editor open.
- `#/lists/{{list-id}}/edit`: one list with the list editor open.
- `#/lists/new`: the list editor for a new list.
- `#/bin`: recycle bin.
- `#/settings`: settings.
- `#/settings/sync-log`: sync log.
- `#/connect`: connect flow.

An unknown route or identifier opens All tasks with a toast naming the missing item.
- An unknown route toast reads "Nothing found at #/{{route}}. Showing All tasks."
- A missing or deleted list reads "That list was not found. Showing All tasks."
- The shell checks list identifiers; the editor tasks check task identifiers.
- An unknown task reads "That task was not found." and closes the editor.

---

## Shared Components

### Task Row
```text
| [status] Description text, truncated...  [due] [list] [list] [+1] [notes] [more] |
```
- The row is 48 px high and shows one line; the whole row opens the task editor.
- The status button opens a status menu listing the four statuses; picking one sets it (`TSK-4`).
- The menu marks the current status and opens on Enter or Space, with arrow keys to choose.
- The status icons differ in shape, not only in color:
  - `todo`: an empty circle.
  - `in-progress`: a half-filled circle.
  - `completed`: a filled circle with a check, and muted text.
  - `cancelled`: a circle with a dash, and struck-through muted text.
- The due chip shows a relative time, such as "Tomorrow 18:00"; overdue tasks show "Overdue" in the signal color (`OVD-2`).
- List chips show at most two list names and a "+n" count; the list view leaves out its own list.
- A note icon with a count appears when the task has notes; a people icon marks tasks in shared lists.
- Compact layouts show only the status, the description, and the due chip, plus the More button in a list view.
- The More button opens the row menu; it has no status entry, since the status button sets it:
  - Add to list and Remove from this list (`TSK-8`).
    Add to list swaps the menu for the lists that do not hold the task yet, and appears only while one is left.
  - Move up and Move down, in a list view with manual order only (`LV-3`).
  - Delete, which moves the task to the recycle bin and shows an Undo toast (`TSK-11`).
- Menu entries the user's role does not allow are left out (`SHR-4`).
- [task-list.js](../../src/js/views/task-list.js) renders the rows and their menus for All tasks and the list view.
  The status menu opens with focus on the current status; after a change, focus stays on that row's button.
  A row that leaves the view after a change passes focus to the row now at its place.

### Add Bar
- One text field and an Add button; Enter adds the task and keeps the field focused (`TSK-1`).
- In a list view, the new task joins that list at its end (`TSK-9`, `LV-5`).
- In All tasks, the new task joins the lists of the active list filter, or no list.
- Compact layouts pin the add bar above the bottom navigation; wide layouts place it above the rows.
- A counter appears from 450 characters, inside the field's end; the field stops at 500.
- A failed add keeps the text and shows a toast.

### View Controls
- A search field filters by text in descriptions and notes (`TV-6`).
- **[Decided]** Search filters once typing pauses for 150 ms or on Enter, so a word runs one query (`TEC-16`).
- Filter chips open popovers with checkboxes or date ranges; compact layouts group them behind one Filters button.
- An active filter chip shows its value, such as "Status: open"; Clear all removes every filter.
- The Sort button opens a menu of order fields with an ascending or descending toggle.
- **[Decided]** Wide layouts put search and Sort on the first row, and the filter chips with Clear all below.
  One row cannot hold the search field, four chips, Clear all, and the Sort label in the 45rem column.
- Compact layouts show search, Filters with the active filter count, and Sort without its field name.
  The Filters panel stacks every filter, scrolls when taller than the screen, and ends with Clear all.
- The Due filter's range and the Created filter use From and To date fields.
- **[Decided]** The search text lasts for the session only, so a reload never hides tasks behind a forgotten search.

### Sync Indicator
- Shows one of these states, each with its own icon and label (`SYN-4`):
  - Local only: not connected; it links to the connect flow.
  - Synced: the last sync time appears in its popover.
  - Syncing: a progress icon, without motion under reduced motion.
  - Offline: a pending change count, such as "Offline · 3 pending".
  - Sign in needed: the session expired (`CON-13`).
  - Sync error: the popover names the error and offers Retry.
- A dot marks unseen sync log entries, such as overwritten values or rejected changes.
- Its popover shows the state, the last sync time, a Sync now button, and a Sync log link.
- Compact layouts place it in the top bar; wide layouts at the sidebar bottom, left-aligned with its items.

### Toasts and Banners
- Toasts confirm actions, offer Undo for 8 seconds, and never hold the only copy of an error.
- A newer app version in another tab shows a lasting banner with Reload, not a toast.
- Banners sit above the content for lasting states, such as view-only lists or an expired session.
- Toasts and banners announce through a polite live region; blocking errors use an alert role.

### Dialogs
- Dialogs use the native `<dialog>` element, trap focus, and close with Escape.
- Compact layouts show dialogs as full-height sheets.

---

## Screens

### All Tasks
Wireframe: [all-tasks.svg](../img/ui/all-tasks.svg).

- Shows every non-deleted task, in any list or none (`TV-1`).
- Filters: Lists, Status, Due, Created, and Shared when connected (`TV-2` to `TV-7`).
- The Lists filter offers every list plus "In no list"; the Due filter offers Overdue, Today, This week, a range, and No due time.
- **[Decided]** The default status filter is "open", `todo` and `in-progress`, matching the list view (`LV-10`).
- Sort fields: Due time, Created, Last activity, Status, and Description (`TV-9`).
- The default sort is Due time ascending, with tasks without a due time last (`TV-10`).
- An empty result names the active filters and offers Clear all.
- Without any task, the screen shows the first-launch empty state and the add bar, without view controls.
- A new task joins the lists of the active Lists filter, leaving out "In no list".
- Overdue chips refresh every minute, also for tasks that keep their status.
  The minute tick redraws only due chips; a Due filter also updates which tasks show.
- **[Decided]** A render builds at most 60 new rows at once and adds the rest after each paint (`TEC-16`).
  With 5000 tasks, the view opens in about 250 ms on desktop; all rows follow within about 1.4 s.
- `TEC-16` is not met yet: it asks for 200 ms on a mid-range phone, and only desktop was measured.
  T0042 virtualizes long lists and verifies 200 ms under 4x CPU throttling.
- Known limitations while rows are still being added, about 1.4 s with 5000 tasks:
  - Find in page and screen reader row counts see only the rows added so far.
  - Move down and drag stop at the last added row.
  - A restored scroll position is clamped to the rows added so far.

### List
Wireframe: [list.svg](../img/ui/list.svg).

- The header shows the list name, its description, the owner and role when shared, and the actions.
  The top bar holds the name; the owner and role arrive with sharing (`SHR-3`).
- Actions: Edit list, Share, and Delete list in a More menu.
- Edit list and Share open the list editor route; Share scrolls to its Sharing section.
- Delete list asks for confirmation, then opens All tasks with an Undo toast (`LST-6`).
- Order buttons form one segmented control: Manual, Due, Created, Activity, Status, and A–Z (`LV-6`).
  Below 36rem of width they wrap into two rows of three.
- **[Decided]** Due, Status, and A–Z sort ascending; Created and Activity show the newest first.
- **[Decided]** The order and the status filter persist per device, shared by every list view (`TV-12`).
- Manual order is the default; rows then show a drag handle on pointer devices (`LV-2`, `LV-3`).
- Keyboard users move a focused row with Alt+Up and Alt+Down, and focus stays on the moved row.
  This works from any control of the row; on the status and More buttons it never opens a menu.
- A polite live region announces each move, such as "Buy paint moved to position 2 of 5."
- Moves place a task next to its shown neighbor, so tasks the status filter hides keep their places.
- **[Decided]** Compact rows keep the More button in the list view, since touch screens show no drag handle.
- Another order button sorts the view only and shows a note: "Sorted by due time. Manual order is kept." (`LV-7`).
- While sorted, drag handles and move entries are hidden; Manual restores the stored order (`LV-8`).
- A status filter chip defaults to "open" (`LV-10`).
- A deleted or unknown list redirects to All tasks with a toast.
- [list.js](../../src/js/views/list.js) builds the screen; [reorder.js](../../src/js/views/reorder.js) turns moves into neighbors.

### Lists Overview
Wireframe: [lists.svg](../img/ui/lists.svg).

- Each list row shows its name, description start, "4 open · 10 total", and sharing state (`LST-5`).
- Shared lists show the owner's name when owned by someone else.
- A New list button opens the list editor for a new list.
- Wide layouts keep this screen for managing lists, though the sidebar also lists them.
- Each row links to its list; without lists, the screen says that a list groups tasks.
- Sharing state and the owner's name arrive with sharing (`SHR-3`); local lists show neither.
- [lists.js](../../src/js/views/lists.js) builds the screen.

### Task Editor
Wireframe: [task-editor.svg](../img/ui/task-editor.svg).

- Wide layouts open it as a right panel next to the rows; compact layouts open it as a full screen.
- Fields save on change, with no Save button; invalid values show a field error and are not saved.
- Sections, in order:
  - Description: a multi-line field of at most 500 characters (`TSK-1`).
  - Status: a segmented control with the four statuses (`TSK-3`, `TSK-4`).
  - Due: a date field, an optional time field, and Clear (`TSK-5`, `TSK-6`).
  - Overdue behavior: Keep open or Cancel automatically, shown once a due time is set (`TSK-7`).
  - Lists: chips with a remove button, plus an Add to list combo box that can also create a list (`TSK-8`).
  - Notes: an add note field, then the note thread, newest first (`NOT-1` to `NOT-5`).
  - Details: created, last updated, last activity, and owner when connected (`TSK-12`).
  - Delete task, at the bottom, after a divider and extra space, away from the notes.
- Each note shows its author when connected, its time, and "edited" after a change.
- The user's own notes have Edit and Delete in a More menu; deleting a note asks in place first.
- A viewer sees all fields read-only and a banner naming the list owner (`SHR-4`).
- A deleted task opens read-only with a Restore button (`BIN-6`).
  It hides Clear, Add to list, the chip remove buttons, the add note field, and Delete task.
- [task-editor.js](../../src/js/views/task-editor.js) and [notes.js](../../src/js/views/notes.js) build it.
- Escape closes the editor, also from a text field, whose change saves first.
- A due time without a date shows "Enter a date to set a time." on the date field.
- The due date and time save once focus leaves both, not per digit; a year below 1000 is an error.
  A due time of exactly 23:59 shows as date-only (`TSK-6`); field errors also go to a polite live region.
- Escape in a note's edit field cancels that edit only; a typed new note stays as a draft for the session.
- Add to list matches lists by name, and offers Create list "{{name}}" for a new name.
- Clear wraps below the date and time fields in the panel's width.
- Deleting from the editor closes it and shows the Undo toast; focus returns to the rows or the add bar.

### List Editor
Wireframe: [list-editor.svg](../img/ui/list-editor.svg).

- **[Decided]** The list editor opens where the task editor opens, and behaves the same way.
- Wide layouts open it as the right panel; compact layouts open it as a full screen.
- Edit list in the list header and New list open it (`LST-1`, `LST-2`, `LST-4`).
- Name and description save on change, like the task editor; there are no Save or Cancel buttons.
- A duplicate or empty name shows a field error and is not saved (`LST-3`).
- A new list is created once its name is valid; closing the editor before that creates nothing.
- Details show the creation time and, when connected, the owner.
- A Sharing section follows the details; see below.
- Delete list sits at the bottom, after a divider, like Delete task.
- Deleting a list asks for confirmation and states that its tasks stay (`LST-6`, `LST-7`).
  A line under Delete list reads "Deleting a list never deletes its tasks."
- The description shows a counter, such as "36 / 1000" (`LST-2`).
- **[Decided]** A created new list keeps the editor on `#/lists/new`, so typing goes on without a reload of the panel.
- Details, Sharing, and Delete list appear once the new list exists.
- Closing the editor, also with Back, saves a typed valid name or description first, like the task editor.
- [list-editor.js](../../src/js/views/list-editor.js) builds it; the List screen's Delete list uses its dialog.

### Sharing Section
- **[Decided]** Sharing is a section of the list editor, not a separate dialog.
- It shows the owner and every person with access (`SHR-1`, `SHR-2`).
- For the owner, each person has a role select and a Remove button, and an invite row follows.
- The invite row has an email field, a role select defaulting to Task editor, and an Invite button.
- Each role option has a one-line explanation, such as "Can add, edit, and reorder tasks".
- Other users see the owner and their own role, read-only (`SHR-3`).
- Offline, every control is disabled and a banner says sharing needs a connection (`SHR-6`).
- In local mode, the section only says "Connect to share this list" and links to the connect flow.

### Recycle Bin
Wireframe: [recycle-bin.svg](../img/ui/recycle-bin.svg).

- Rows show a type icon, the name or description, and "Deleted 5 days ago · 25 days left" (`BIN-1`).
- Each row has Restore and Delete permanently (`BIN-2`, `BIN-4`).
- Delete permanently asks in the row first, with Delete and Keep buttons.
- Restoring shows a toast linking to the restored item (`BIN-3`).
- An empty bin says that deleted items stay here for 30 days; otherwise that note sits above the rows.
- Compact rows show only the days left and an icon-only Delete permanently; the question takes its own line.

### Settings
Wireframe: [settings.svg](../img/ui/settings.svg).

Settings is one page with these sections:
- Appearance: theme as System, Light, or Dark.
- Data: Export backup and Import backup (`BAK-1`, `BAK-5`).
- Connection, when local: a short explanation of connected mode and a Connect button.
- Connection, when connected: account name and email, server, sync state, Sync log, and Disconnect.
- Connection also holds the server URL, changeable only while disconnected (`CON-12`).
- About: app version, build date, and a link to the requirements and source.
  [version.js](../../src/js/version.js) holds both; a unit test matches the version to package.json.
- The theme applies at once; a theme the browser cannot store shows a toast saying it lasts until reload.
- Connect opens the connect screen; connected, the section shows "Signed in as {{name}} ({{email}})" and the server.
- Sync state and the Sync log link join the connected section with the sync indicator task.
- An expired session adds "Your session expired." with Sign in again, which opens the connect screen.
- Disconnect opens a dialog; without pending changes it offers Cancel and Disconnect, and a toast confirms.
- The server URL defaults to `https://todos.pellicciotta.com`; an invalid address shows an error, and empty restores it.
- It takes https, or http on `localhost`, `127.0.0.1`, or `[::1]`; the query and fragment are dropped.

### Sync Log
Wireframe: [sync-log.svg](../img/ui/sync-log.svg).

- Lists sync events of the last 30 days, newest first (`SYN-8`).
- Entry kinds: overwritten value, rejected change, lost access, and sync error.
- Overwritten value entries show the item, the field, the lost value, and the kept value.
- Rejected change entries show the item, the reason, and the change that was undone (`SYN-9`).
- Each entry links to its item while that item still exists.
- Opening the sync log clears the sync indicator dot.

---

## Key Flows

### First Launch
Wireframe: [first-launch.svg](../img/ui/first-launch.svg).

1. The app opens All tasks in local mode, with no sign-in prompt (`LOC-1`).
2. The empty state reads "No tasks yet. Your tasks stay on this device."
3. It offers the add bar, an Import a backup link to Settings, and a Connect to sync across devices link.
4. The first added task replaces the empty state; no setup step appears (`LOC-2`).
5. The app asks for persistent storage after the first task is added, not on load (`TEC-5`).

### Creating and Organizing Offline
1. The user adds tasks with the add bar in All tasks or in a list.
2. New list in the sidebar, the Lists screen, or the editor's Add to list box creates a list.
3. The editor's Lists section adds a task to several lists; the row menu adds one list at a time.
4. In a list with manual order, the user drags rows or uses Move up and Move down.
5. Every step works offline; the sync indicator stays at Local only.

### Connecting
Wireframe: [connect.svg](../img/ui/connect.svg).

1. The user opens Settings and selects Connect, or the Local only indicator.
2. The connect screen explains the gains, the loss of anonymity, and the invitation-only access (`CON-2`).
3. Sign in sends the browser to the Auth service; it returns to `#/connect` with a session.
   The screen names the server; a code from a sign-in this device did not start shows "Sign-in did not finish."
4. A user without an invitation sees a page saying access is by invitation only, and stays local (`CON-3`).
   **[Decided]** Until sync lands, the screen ends at "Signed in as {{name}} ({{email}})" with Done.
5. On success, the screen shows upload progress: "Uploading 5 lists and 34 tasks" (`CON-4`).
6. It names merged lists, such as "Your list Home merged with your account's Home" (`CON-5`).
7. It downloads the account's data, then shows Done and returns to All tasks (`CON-6`).
8. An interruption keeps the screen resumable; restarting the upload creates no duplicates (`SYN-10`).

### Syncing
1. Each change applies locally and the indicator turns to Syncing, then Synced (`SYN-1`).
2. Offline, the indicator shows Offline with the pending count, and work continues (`SYN-2`).
3. Back online, the queue syncs without user action, and remote changes appear in place (`SYN-3`).
4. A failing sync shows Sync error; its popover names the error and offers Retry.

### Resolving Conflicts
1. Two devices edit one task before syncing; different fields both survive (`SYN-5`).
2. For the same field, the latest edit wins without a dialog (`SYN-6`).
3. The losing value goes to the sync log, and the indicator shows its dot (`SYN-8`).
4. The user opens the sync log and can copy the lost value back by hand.

### Losing Access While Offline
1. The user edits tasks of a shared list while offline; the changes queue (`SHR-7`).
2. The owner revokes access before the queue syncs.
3. On sync, the service rejects the queued changes; the app undoes them locally (`SYN-9`).
4. The list and its tasks owned by others disappear (`SHR-8`).
5. A toast says "You no longer have access to Groceries. 2 changes were undone."
6. The sync log keeps the undone changes, with their values.

### Session Expiry
1. An expired session turns the indicator to Sign in needed and shows a banner (`CON-13`).
   Until the sync indicator task, only Settings and the connect screen show the expired session.
2. The app keeps working and queues changes.
3. Sign in on the banner restores the session and syncs the queue.

### Disconnecting
1. The user selects Disconnect in Settings.
2. A dialog explains that own lists and tasks stay on the device and lists of others go (`CON-8`, `CON-9`).
3. With pending changes, the dialog offers Sync and disconnect, Disconnect anyway, and Cancel (`CON-10`).
4. After disconnecting, the app deletes the session token and shows Local only (`TEC-18`).

### Exporting a Backup
1. The user selects Export backup in Settings.
2. The browser saves `todos-backup-{{yyyy-mm-dd}}.json` at once (`BAK-1`, `BAK-4`).
3. A toast names the file and its counts of lists and tasks: "Saved todos-backup-2026-11-04.json with 1 list and 2 tasks."

### Importing a Backup
Wireframe: [import.svg](../img/ui/import.svg).

1. The user selects Import backup and picks a file in the dialog's Backup file field, which has focus.
2. An invalid file shows the reason under the field, keeps Import disabled, and changes nothing (`BAK-13`).
3. A valid file shows its name, export date, and counts, and the mode choice: Merge or Overwrite (`BAK-5`).
4. Merge is the default; Overwrite explains that missing own items move to the recycle bin (`BAK-9`).
5. The dialog shows the counts of added, updated, and binned items for the chosen mode (`BAK-11`).
   They update when the mode changes; overwrite adds "N removed" when it deletes memberships or notes.
6. Import applies the change and a toast repeats the counts; Cancel, Close, and Escape change nothing (`BAK-12`).
   The actions follow the dialog component: Cancel, then Import at the end.
7. When connected, the dialog notes that lists of other owners stay unchanged (`BAK-10`).

---

## Accessibility and Input
- Every screen works with keyboard alone, in a logical tab order (`TEC-15`).
- Shortcuts: `n` focuses the add bar, `/` focuses search, and Escape closes the editor or a dialog.
- `n` and `/` focus the view's `[data-shortcut="add"]` and `[data-shortcut="search"]` elements, and do nothing without them.
- Ctrl+Z or Cmd+Z, outside text fields and modal dialogs, runs the Undo of the newest toast.
  It never runs another toast action, such as Reload.
- Shortcuts never fire while a text field has focus, and the About section lists them.
- Drag and drop always has the Move up and Move down alternative (`LV-3`).
- Status, overdue, and sync state never rely on color alone: each has an icon and a text label.
- Touch targets are at least 44 by 44 px, including chips and row buttons.
- Focus moves to the editor's description when it opens, and back to the row when it closes.
- Live regions announce toasts, sync state changes, and moved rows.

---

## Wireframes
The [ui wireframes](../img/ui/) show each screen at 390 px and 1440 px side by side.
They are low fidelity: gray boxes and placeholder text, without the design system's colors or fonts.
[draw-wireframes.py](../../scripts/draw-wireframes.py) draws them; regenerate them after changing a screen, as [devops.md](../devops.md) describes.
