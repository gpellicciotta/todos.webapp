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
- Views: `tasks`, `lists`, `list`, `bin`, `settings`, `sync-log`, and `connect`.
- The `[data-editor-slot]` element names the open editor in `data-editor`: `task`, `list`, or empty.
  It stays hidden until the editor tasks fill it; it covers the main column in compact layouts.
- Editor routes keep their view, so opening an editor keeps the view's scroll and state.
- Scroll positions and a memory object for filters and sort are kept per view, for the session.
- The page title reads "{{route title}} · ToDo's"; a list route shows the list name.
- On start the app opens the store, cancels overdue `cancel` tasks, purges expired bin entries, then starts the overdue timer.
- The theme follows the system unless `localStorage` holds `todos.theme` as `light` or `dark`.

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
- Compact layouts show only the status, the description, and the due chip.
- The More button opens the row menu:
  - Add to list and Remove from this list (`TSK-8`).
  - Move up and Move down, in a list view with manual order only (`LV-3`).
  - Delete, which moves the task to the recycle bin and shows an Undo toast (`TSK-11`).
- Menu entries the user's role does not allow are left out (`SHR-4`).

### Add Bar
- One text field and an Add button; Enter adds the task and keeps the field focused (`TSK-1`).
- In a list view, the new task joins that list at its end (`TSK-9`, `LV-5`).
- In All tasks, the new task joins the lists of the active list filter, or no list.
- Compact layouts pin the add bar above the bottom navigation; wide layouts place it above the rows.
- A counter appears from 450 characters; the field stops at 500.

### View Controls
- A search field filters by text in descriptions and notes (`TV-6`).
- Filter chips open popovers with checkboxes or date ranges; compact layouts group them behind one Filters button.
- An active filter chip shows its value, such as "Status: open"; Clear all removes every filter.
- The Sort button opens a menu of order fields with an ascending or descending toggle.

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

### List
Wireframe: [list.svg](../img/ui/list.svg).

- The header shows the list name, its description, the owner and role when shared, and the actions.
- Actions: Edit list, Share, and Delete list in a More menu.
- Share opens the list editor scrolled to its Sharing section.
- Order buttons form one segmented control: Manual, Due, Created, Activity, Status, and A–Z (`LV-6`).
- Manual order is the default; rows then show a drag handle on pointer devices (`LV-2`, `LV-3`).
- Keyboard users move a focused row with Alt+Up and Alt+Down, and focus stays on the moved row.
- Another order button sorts the view only and shows a note: "Sorted by due time. Manual order is kept." (`LV-7`).
- While sorted, drag handles and move entries are hidden; Manual restores the stored order (`LV-8`).
- A status filter chip defaults to "open" (`LV-10`).
- A deleted or unknown list redirects to All tasks with a toast.

### Lists Overview
Wireframe: [lists.svg](../img/ui/lists.svg).

- Each list row shows its name, description start, "4 open · 10 total", and sharing state (`LST-5`).
- Shared lists show the owner's name when owned by someone else.
- A New list button opens the list editor for a new list.
- Wide layouts keep this screen for managing lists, though the sidebar also lists them.

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
- An empty bin says that deleted items stay here for 30 days.

### Settings
Wireframe: [settings.svg](../img/ui/settings.svg).

Settings is one page with these sections:
- Appearance: theme as System, Light, or Dark.
- Data: Export backup and Import backup (`BAK-1`, `BAK-5`).
- Connection, when local: a short explanation of connected mode and a Connect button.
- Connection, when connected: account name and email, server, sync state, Sync log, and Disconnect.
- Connection also holds the server URL, changeable only while disconnected (`CON-12`).
- About: app version, build date, and a link to the requirements and source.

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
3. It offers the add bar, an Import a backup link, and a Connect to sync across devices link.
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
4. A user without an invitation sees a page saying access is by invitation only, and stays local (`CON-3`).
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
3. A toast names the file and its counts of lists and tasks.

### Importing a Backup
Wireframe: [import.svg](../img/ui/import.svg).

1. The user selects Import backup and picks a file.
2. An invalid file shows the reason and changes nothing (`BAK-13`).
3. A valid file shows its export date and counts, and the mode choice: Merge or Overwrite (`BAK-5`).
4. Merge is the default; Overwrite explains that missing own items move to the recycle bin (`BAK-9`).
5. The dialog shows the counts of added, updated, and binned items for the chosen mode (`BAK-11`).
6. Import applies the change; Cancel changes nothing (`BAK-12`).
7. When connected, the dialog notes that lists of other owners stay unchanged (`BAK-10`).

---

## Accessibility and Input
- Every screen works with keyboard alone, in a logical tab order (`TEC-15`).
- Shortcuts: `n` focuses the add bar, `/` focuses search, and Escape closes the editor or a dialog.
- `n` and `/` focus the view's `[data-shortcut="add"]` and `[data-shortcut="search"]` elements, and do nothing without them.
- Ctrl+Z or Cmd+Z, outside text fields, runs the Undo of the newest toast.
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
