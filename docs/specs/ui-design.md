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
- Quiet chrome: the account, Recycle bin, and Settings sit behind the user button, since they are needed only now and then.
- Keyboard and touch parity: every drag, hover, or shortcut has a visible button alternative.

---

## Layout and Navigation

### Breakpoints
- Compact layout below 64rem (1024 px): one column, a top bar, and a bottom navigation bar.
- Wide layout from 64rem: a left sidebar, the main column, and an optional editor panel on the right.
- The editor panel holds the task editor, the list editor, or the view options, never two at once.
- The main column caps its width, so task rows stay readable on 1440 px screens.

### Compact Layout
```text
+--------------------------------------+
| Title                          (o)   |  top bar
+--------------------------------------+
| ( ) Buy paint            Tomorrow    |
| (/) Call plumber         Overdue  !  |  task rows
| ( ) Book flights                     |
|                                      |
+--------------------------------------+
| [Search or add a task..........] [+] |  add bar
| 24 tasks · Status: open              |  info line
+--------------------------------------+
| Tasks                    Lists       |  bottom navigation
+--------------------------------------+
```

### Wide Layout
```text
+--------------+-------------------------------+---------------------+
| ToDo's       | All tasks            [...] (o)| Task, list, or view |
|              |                               | Description         |
| All tasks 24 | [Search or add a task...] [+] | Status              |
| Lists        | 24 tasks · Status: open       | Due time            |
|  Home     8  | ( ) Buy paint      Tomorrow   | Lists               |
|  Work    12  | (/) Call plumber   Overdue !  | Notes               |
|              | ( ) Book flights              |                     |
|              |                               |                     |
+--------------+-------------------------------+---------------------+
```

### Navigation Rules
- Destinations: All tasks, Lists, each single list, Recycle bin, and Settings.
- The compact bottom bar holds Tasks and Lists; the wide sidebar holds the same plus every list.
- The sidebar lists each list with its open task count.
  It has no creation action; New list stays on the Lists screen.
- From 12 lists the sidebar gains a find field and scrolls only its lists; see [Sidebar With Many Lists](#sidebar-with-many-lists).
- Recycle bin and Settings sit in the user menu, so many lists never push them out of sight.
- **[Decided]** Routes use the URL hash, such as `#/lists/{{list-id}}`, since GitHub Pages has no route rewrites.
- Back and forward buttons move between routes; opening the task editor adds a route.
- Each route restores its scroll position, filters, and sort (`TV-12`).

### Sidebar With Many Lists
Wireframes: [lists-many.svg](../img/ui/lists-many.svg) and [lists-find.svg](../img/ui/lists-find.svg).

The wide sidebar must stay usable from 12 lists up to 500.
The [Lists Overview](#lists-overview) section decides finding, ordering, and rendering for both surfaces.
- **[Decided]** Only the lists scroll: the brand, All tasks, Lists, and the find field stay fixed above them.
  The rows take the rest of the height with a thin scrollbar.
  `overscroll-behavior: contain` keeps the page still at the ends.
  Reason: All tasks, Lists, and Find stay in reach at any scroll depth.
- **[Decided]** The current list stays in view.
  A route to a list scrolls its row to the nearest edge, only when the row is out of view.
  A count update never moves the scroll; the scroll position survives route changes, since one DOM holds the sidebar.
- **[Decided]** The find field shows from 12 lists, or while it holds text; fewer lists need no extra chrome.
  Reason: 12 rows of 40 px with 4 px gaps fill about half of a 900 px high sidebar.
- **[Decided]** The sidebar field is a quick jump: it matches names only and keeps the manual order.
  It counts matches at its end, such as "4 of 124".
  Enter or a click on a result opens that list and clears the field; Escape clears it; Down moves into the first row.
  The field is empty again on each start, like the add bar's search text.
- **[Decided]** No match leaves the muted line "No list matches." and no creation action.
  The Lists screen offers Create list.
- **[Decided]** Rows stay 40 px with 4 px gaps, and the sidebar has no density option.
  A long name ends in an ellipsis and the link's `title` holds the full name.
- **[Decided]** The sidebar always follows the manual order (`LST-8`); the sort of the Lists screen never changes it.
- **[Decided]** One flat list: no pinned, favorite, or collapsible groups.
  Reason: manual order already pins, since Move to top puts a list first.
  A group flag would be one more value that never syncs, as the order stays on the device.
- A count of 0 shows nothing, and 1000 or more reads "999+".
  The visually hidden text keeps the exact number.
- The sidebar patches rows by list identifier instead of rebuilding them.
  Focus, scroll, and the find text survive a count change.

### App Shell
[app.js](../../src/js/app.js), [router.js](../../src/js/ui/router.js), and [layout.js](../../src/js/ui/layout.js) build the shell.
[app-shell.css](../../src/css/app-shell.css) places its parts; one DOM holds both layouts.
- The top bar holds the route title and the user button, preceded by the inbox bell while connected; it has no More menu.
- The wide layout shows the title above the main column, with the user button at its right end.
- The sync indicator sits beside the user button, before the inbox bell; see Sync Indicator below.
- A session banner above the view offers Sign in while the session expired.
- The main column scrolls; the bars and the sidebar stay in place.
- [user-menu.js](../../src/js/ui/user-menu.js) builds the user menu; see User Menu below.
- [inbox.js](../../src/js/ui/inbox.js) builds the inbox bell and the broadcast banners; see Inbox below.
- Each route renders an empty `[data-view]` element, such as `data-view="tasks"`, in the main column.
  List views also carry `data-list-id`; the screen tasks fill these views.
  [all-tasks.js](../../src/js/views/all-tasks.js) fills `tasks`, [lists.js](../../src/js/views/lists.js) `lists`,
  [recycle-bin.js](../../src/js/views/recycle-bin.js) `bin`, [settings.js](../../src/js/views/settings.js) `settings`,
  and [connect.js](../../src/js/views/connect.js) `connect`, and [sync-log.js](../../src/js/views/sync-log.js) `sync-log`.
- A banner area above the view holds lasting notices, such as a newer version in another tab with Reload.
- Moving to another view moves focus to the main column, which the route title labels.
- Views: `tasks`, `lists`, `list`, `bin`, `settings`, `sync-log`, and `connect`.
- The `[data-editor-slot]` element names the open editor in `data-editor`: `task`, `list`, or empty.
  [editor-panel.js](../../src/js/views/editor-panel.js) mounts the editor of the route and unhides the slot.
  It covers the main column in compact layouts; an editor not built yet leaves the slot hidden.
- Editor routes keep their view, so opening an editor keeps the view's scroll and state.
- Scroll positions and a memory object are kept per view, for the session; it keeps the search text.
- Filters, grouping, and sort persist per device in `localStorage`, such as `todos.view.tasks`, or `todos.view.list.{{list-id}}` for a list (`TV-12`).
  [preferences.js](../../src/js/core/preferences.js) reads and writes these keys; blocked storage falls back to defaults.
- The page title reads "{{route title}} · ToDo's"; a list route shows the list name.
- On start the app opens the store, purges expired bin entries, then starts the overdue timer.
  The timer's first run cancels overdue `cancel` tasks.
- A start-up failure replaces the view with an error banner asking for a reload.
- The theme follows the system unless `localStorage` holds `todos.theme` as `light` or `dark`, plain or as JSON.
  A stored theme also sets every `theme-color` meta, so the browser bar matches it.

### User Menu
Wireframe: [user-menu.svg](../img/ui/user-menu.svg).

- A circular user button ends the top bar in both layouts; it is at least 44 px wide.
- Local mode: the button shows a person icon, hovering shows "Local User", and so does its accessible name.
- Connected: the button shows the account's initials, such as JD, and hovering shows the account name, or the email without one.
- Click or Enter opens a panel under the button, its end edge lined up with the button's.
- Escape, an outside click, or choosing a link closes the panel.
- The panel shows the user name, the connection state, then Recycle bin and Settings as buttons with icons.
- The state reads "Local only", "Connected", or "Sign in needed" (`CON-13`); the link of the current route is marked.
- Expired session: the panel says Sign in needed; the Sign in button sits in the session banner (see Sync Indicator).
- Local mode has no Sign in text on the page (`LOC-1`); Connect stays reachable from Settings and the empty states.
- The panel reads the session each time it opens and when the session changes.

### Inbox
- Connected only: a bell icon button sits before the user button, at least 44 px wide, named "Inbox" (`NTF-1`, `NTF-2`).
  Local mode and an expired session show no bell and send no request (`LOC-1`, `LOC-3`).
- Unread notifications show their count in a badge on the bell, capped at "99+"; the accessible name reads "Inbox, 3 unread".
- Click or Enter opens a panel under the bell, its end edge lined up with the bell's; Escape, an outside click, or Tab away closes it.
- The panel header holds the title and Clear all. Rows follow, most recent first; each shows its title, message, and time in the device timezone.
- Each row offers Open for a safe action link (`NTF-7`), Mark read while unread, and Discard; unread rows carry a signal edge.
- An empty inbox reads "No notifications", with Clear all disabled; an unreachable service adds "Offline. Showing the last inbox." (`NTF-6`).
- A change the service does not accept leaves the panel as it was and shows a toast, "The service could not be reached. Try again."
- A notification marked as a banner and still unread also shows a banner above every view, below any lasting notice (`NTF-3`).
  It holds the title, the message, Open for a safe link, and Dismiss, which marks the notification read.
  A new banner is announced through the polite live region once.

### Routes
- `#/tasks`: all tasks.
- `#/tasks/{{task-id}}`: all tasks with the task editor open.
- `#/tasks/view-options`: all tasks with the view options open.
- `#/lists`: lists overview.
- `#/lists/{{list-id}}`: one list.
- `#/lists/{{list-id}}/tasks/{{task-id}}`: one list with the task editor open.
- `#/lists/{{list-id}}/edit`: one list with the list editor open.
- `#/lists/{{list-id}}/view-options`: one list with the view options open.
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
  - `todo`: an empty circle, in the muted text color.
  - `in-progress`: a circle with a filled bottom half, in blue.
  - `completed`: a filled circle with a check, in green, and struck-through muted text.
  - `cancelled`: a filled circle with a dash, in the danger color, and struck-through muted text.
- The due chip shows a relative time, such as "Tomorrow 18:00"; overdue tasks show "Overdue" in the signal color (`OVD-2`).
- List chips show at most two list names and a "+n" count; the list view leaves out its own list.
- A note icon with a count appears when the task has notes; a people icon marks tasks in shared lists.
- Compact layouts show only the status, the description, and the due chip, plus the More button in a list view.
- The More button opens the row menu; it has no status entry, since the status button sets it:
  - Add to list and Remove from this list (`TSK-8`).
    Add to list swaps the menu for the lists that do not hold the task yet, and appears only while one is left.
    If a render leaves no such list, the menu closes and focus returns to the More button.
  - Move up and Move down, in a list view with manual order only (`LV-3`).
  - Delete, which moves the task to the recycle bin and shows an Undo toast (`TSK-11`).
- Menu entries the user's role does not allow are left out (`SHR-4`):
  a viewer has a disabled status button and no More button; a task editor has Add to list (only to lists they may add to)
  and Remove from this list, and only the task owner or the owner of a list holding the task sees Delete.
- [task-list.js](../../src/js/views/task-list.js) renders the rows and their menus for All tasks and the list view.
  The status menu opens with focus on the current status; after a change, focus stays on that row's button.
  A row that leaves the view after a change passes focus to the row now at its place.

### Add Bar
- One text field and an Add button; only the Add button or Shift+Enter or Alt+Enter creates the task (`TSK-1`, `VO-3`).
  Enter applies the typed search at once but never adds.
- **[Decided]** After an add, the new task opens in the task editor (`TSK-13`).
  The route is `#/tasks/{{task-id}}` in All tasks and `#/lists/{{list-id}}/tasks/{{task-id}}` in a list view.
  A failed add opens nothing and keeps the text in the field.
- **[Decided]** Wide layouts keep the focus in the add field, beside the editor, so tasks can be added in a row.
  Compact layouts give the focus to the editor's Description, since the editor covers the add field.
- The field also searches the view; [Search and Add](#search-and-add) describes this.
- In a list view, the new task joins that list at its end (`TSK-9`, `LV-5`).
- **[Decided]** In All tasks, the new task joins no list, even while the Lists filter selects lists.
  A Lists filter that hides it brings the "Task added" toast with Show.
- Compact layouts pin the add bar above the bottom navigation; wide layouts place it above the rows.
- A counter appears from 450 characters, inside the field's end; the field stops at 500.
- A failed add keeps the text and shows a toast.

### Search and Add
Wireframe: [all-tasks.svg](../img/ui/all-tasks.svg).

```text
[ paint.................................................. ] [Add]
12 of 24 tasks · Status: open · Grouped by List                Reset
                                                       (32 px or more)
Home                                                              3
( ) Buy paint for the hallway   ...
```

- **[Decided]** The add field doubles as search (`VO-3`): its placeholder reads "Search or add a task".
  Typing filters the rows to tasks whose description or notes match, on top of the view options (`TV-6`, `TV-8`).
  A duplicate is hard to miss, since an existing task appears while the user types.
- **[Decided]** Only the Add button and its shortcuts add.
  Enter never adds, so a user who only searches cannot create a task by accident.
  **[Decided]** Shift+Enter or Alt+Enter in the field adds at once, in All tasks and in every list view.
  The field names both in `aria-keyshortcuts`, and the Add button's tooltip names them.
  Keyboard users can also Tab to Add and press Enter or Space.
- **[Decided]** The info line sits right under the field (`VO-7`):
  - It starts with the count, such as "24 tasks", or "12 of 24 tasks" while filters or text narrow the view.
  - It names each active filter, including the default "Status: open", so hidden tasks never surprise.
  - It adds "Grouped by ..." and "Sorted by ..." only when they differ from the defaults.
  - It is 12 px muted text on one line; it wraps to two lines, then truncates, and the view options show the rest.
  - **[Decided]** A quiet Reset link ends the line while any option differs from its default (`VO-8`).
    Reset also clears the search text, since the line names it.
- **[Decided]** The field and its info line form one block, set apart from the rows by at least 32 px of whitespace.
  On compact layouts the block is the pinned bar above the bottom navigation, so the rows scroll above it.
- When a matching task has exactly the typed text, the Add button reads "Add anyway".
  The check ignores case and surrounding spaces, and covers every non-deleted task the view options show.
- With no match, the rows give way to the line "No task matches. Add creates it."
  With a match, a muted line under the rows says what Add creates.
- A task added while the view options hide it, such as a new task under "Status: done", shows a toast.
  The toast names the hidden state and offers Show, which resets the options that hide the task.
- Add clears the field, which removes the filter.
- The `/` shortcut and `n` both focus the field; Escape in a non-empty field clears it.
- The rows filter once typing pauses for 150 ms, so a word runs one query (`TEC-16`).
- **[Decided]** The typed text lasts for the session only, so a reload never hides tasks behind forgotten text.
  A field with text is visible, so the filter is never hidden.
- A viewer of a shared list sees "Search tasks" and no Add button (`VO-14`).

### View Options
Wireframe: [view-options.svg](../img/ui/view-options.svg).

- **[Decided]** The More menu opens the view options (`VO-4`).
  A list view's menu holds Edit list, Edit view options, Share list, and Delete list.
  The All tasks menu holds Edit view options only, since All tasks acts as a special list without list actions.
- **[Decided]** The options open where the editors open (`VO-5`):
  a right panel on wide layouts, and a full screen with a back button on compact layouts.
  Escape or the close button closes the panel; the route keeps the view, as for the editors.
- Changes apply at once, with no Apply button; the rows behind the panel update as the user chooses.
  The compact screen ends with a primary button, "Show 12 tasks", which goes back.
- Sections, in order (`VO-6`):
  - Filter: an accordion of Lists, Status, Due, and Created, plus Shared when connected (`TV-2` to `TV-5`, `TV-7`).
    Shared is a row of All tasks only, with the radios Any, Shared, and Not shared; local mode ignores a stored value.
    Each row shows its value at the right; opening one row closes the other.
    Due keeps its quick options and a From and To range; Created has From and To.
    Status ends with a "Finished today only" checkbox (`TV-14`); see [Finished today only](#finished-today-only).
  - Group by: a segmented control with None, List, Due date, and Status (`VO-9`).
  - Sort by: a field menu and an Ascending or Descending toggle (`TV-9`).
  - Reset at the top: restores every option to its default (`VO-8`).
- Defaults: open statuses, creation time descending (manual order in a list view), no grouping, no other filter.
- A stored Lists filter whose lists were all deleted filters nothing, so the info line leaves it out.
- The panel uses native inputs: checkboxes, radios, a select, and date fields.
- A polite live region announces the count after each change, such as "12 tasks" (`VO-13`).
- **[Decided]** The options persist per device: one entry for All tasks, and one entry per list, such as `todos.view.list.{{list-id}}`.
  A list without an entry shows the list defaults. Reset restores the defaults and removes the entry of that list only.
  The entry shared by every list view of earlier versions is no longer read.

#### Differences between the views
| Option      | All tasks                    | List view                                      |
| :---------- | :--------------------------- | :--------------------------------------------- |
| More menu   | Edit view options            | Edit list, Edit view options, Share list, Delete list |
| Lists       | filter row                   | not offered                                    |
| Group by    | None, List, Due date, Status | None, Due date, Status (`LV-11`)               |
| Sort by     | five fields                  | adds Manual order, the default (`LV-6`)        |
| Defaults    | open, created newest first   | open, manual order                             |
| Persistence | one entry for All tasks      | one entry per list (`TV-12`)                   |

#### Finished today only
- A checkbox after the four statuses in the Status row, in All tasks and every list view (`TV-14`).
- It narrows Completed and Cancelled to tasks finished today; To do and In progress are unaffected.
  - All four statuses with the choice show the open tasks and the work finished today.
  - An empty status filter with the choice does the same.
  - With only open statuses checked, it changes nothing.
- **[Decided]** A finished task counts as finished today when its `last-update-time` falls on the current local day.
  Tasks store no completion time; so editing an old finished task today also shows it.
- The info line and the row value add ", finished today", such as "Status: 4 statuses, finished today".
  An empty status filter reads "Status: all, finished today".
- It persists with the other options and counts as a change, so Reset shows and clears it (`TV-12`, `VO-8`).
- Show in the hidden-task toast resets the Status filter, the choice included.
- Both views render again on the minute tick while it is on, so yesterday's tasks leave at midnight.

#### Grouping
- A group header is a 32 px row: the name at the left, the count at the right (`VO-10`).
- **[Decided]** A task in several lists shows under each list group, so group counts can exceed the task count (`VO-11`).
  The count on the info line counts each task once.
- Group order (`VO-12`):
  - List: as arranged in the sidebar, then No list.
  - Due date: Overdue, Earlier, Today, Tomorrow, This week, Later, No due date.
    Earlier holds finished tasks due before today, since a finished task is never overdue.
    This week runs to the end of the week that starts on Monday.
  - Status: To do, In progress, Completed, Cancelled.
- Search, filters, and sort apply inside each group; empty groups are left out.
- While a list view is grouped, drag handles and move entries are hidden, as for any sort (`LV-8`).
  Each group keeps the sort of the view, so the manual order still applies inside it.
- Collapsing groups is out of scope for now.

#### Design alternatives
- **A. Search and add in one field, view options in the side panel (chosen).**
  Nothing but the field and a quiet line shows at rest; options sit behind the More menu, where list actions already live.
  Costs two taps to change a filter, which suits settings changed rarely.
- B. A quiet bar with Search and View buttons, with the panel as a popover or sheet.
  Keeps filters one tap away, but adds permanent controls and a second text field.
- C. Separate Filter, Group, and Sort buttons.
  Each opens a small panel, like the old chips, but three buttons stay on screen.
- D. A query field with typed tokens, such as `status:open due:today`.
  Quickest for experts, but hard to discover and to use on touch screens; it needs a parser.

### Sync Indicator
[sync-indicator.js](../../src/js/views/sync-indicator.js) builds the indicator, its popover, and the session banner.
- **[Decided]** The indicator is a button beside the user button, before the inbox bell, in both layouts.
  A badge on the user button would hide the state behind the account and clash with the initials.
- Shows one of these states, each with its own icon and label (`SYN-4`):
  - Local only: not connected; its popover links to the connect flow.
  - Synced: the last sync time appears in its popover.
  - Syncing: a progress icon, without motion under reduced motion.
  - Offline: a pending change count, such as "Offline · 3 pending".
  - Sign in needed: the session expired (`CON-13`); the popover and the banner offer Sign in.
  - Sync error: the popover names the error and offers Retry.
  - Update required: the service refuses this app version, or its feed uses a newer protocol; syncing stops (`SYN-11`).
    The popover names the minimum version and offers Check for update, which looks for a new worker; its Update toast follows.
    It uses the alert icon.
- Below 40 rem the label hides visually and stays in the accessible name, so the top bar keeps room for the title.
- A dot marks sync log entries newer than the last visit to the Sync log, such as overwritten values or rejected changes (`SYN-8`).
  The last visit is kept per device in `todos.sync-log.seen`.
- Its popover shows the state, the last sync time or the error, a Sync now button, and a Sync log link.
  Sync now asks the engine for an immediate queue replay and poll; Retry does the same after an error.
- The session banner sits above the views while the session needs a new sign-in, with Sign in, which opens `#/connect`.
- A changed state is announced through the polite live region, except Syncing.

### Toasts and Banners
- Toasts confirm actions, offer Undo for 8 seconds, and never hold the only copy of an error.
- A newer app version in another tab shows a lasting banner with Reload, not a toast; the live region reads it.
- Banners sit above the content for lasting states, such as view-only lists or an expired session.
- A waiting service worker shows an Update toast, "A new version is ready", with an Update button (`TEC-19`).
  It never times out; dismissing it hides it until the next start. The first install shows none.
- A database upgrade that an old tab blocks shows "Close other tabs of ToDo's to finish the update".
  A tab whose database another tab upgraded closes its connection and shows the reload banner.
- Toasts and banners announce through a polite live region; blocking errors use an alert role.

### Dialogs
- Dialogs use the native `<dialog>` element, trap focus, and close with Escape.
- Compact layouts show dialogs as full-height sheets.
- Import backup is the exception: below 64rem it opens in the main view, like the editors.
  It sits between the top bar and the bottom bar, has no scrim, and is not modal; a route change cancels it.

---

## Screens

### All Tasks
Wireframe: [all-tasks.svg](../img/ui/all-tasks.svg).

- Shows every non-deleted task, in any list or none (`TV-1`).
- Filters sit in the view options: Lists, Status, Due, Created, and Shared when connected (`TV-2` to `TV-7`).
- The Lists filter offers every list plus "In no list"; the Due filter offers Overdue, Today, This week, a range, and No due time.
- **[Decided]** The default status filter is "open", `todo` and `in-progress`, matching the list view (`LV-10`).
- Sort fields: Due time, Created, Last activity, Status, and Description (`TV-9`).
- **[Decided]** The default sort is Created, newest first, so a new task comes first (`TV-13`).
  Sorting by Due time still puts tasks without a due time last (`TV-10`).
- Grouping by List, Due date, or Status is available here first (`VO-9`); see [View Options](#view-options).
- A More menu with Edit view options sits in the page header; the shell's top bar has no More menu.
- An empty result names the active filters and offers Reset.
- Without any task, the screen shows the first-launch empty state and the add bar, without view controls.
- A new task joins no list; a Lists filter that hides it brings the "Task added" toast with Show.
- Overdue chips refresh every minute, also for tasks that keep their status.
  The minute tick redraws only due chips; a Due filter also updates which tasks show.
- **[Decided]** Lists of up to 200 tasks render every row; longer lists render only the rows in view (`TEC-16`).
  Rows past the view, 20 on each side, follow once the first rows painted, and scrolling renders rows as they enter.
  Padding and row margins stand in for the rows left out, so the scroll height and scrollbar stay true.
  Rows are 48 px high at least; a taller row, such as one with a larger text size, is measured once it shows.
  The offsets of the rows add up the measured heights and the base height of the rows not yet seen.
  A resize of the window or of the list measures the rows again; rows that come in with another height than expected
  move the scroller by the difference, so the rows in view stay where they are.
- The focused row, the row of an open menu, the dragged row, and the selected row stay rendered when scrolled away.
  Their neighbors stay too, so Tab reaches the next row; menus stay open, and drags keep their row.
- Rows carry `aria-setsize` and `aria-posinset`, so screen readers count every task, rendered or not.
- Move up, Move down, Alt+Up, Alt+Down, and drag targets cover the whole list; a moved row scrolls into view.
- `TEC-16` is met for opening a view under 4x CPU throttling, the stand-in for a mid-range phone.
  The 150 lists it now names are unmeasured until the Lists render check lands; see Many Lists.
  With 5000 tasks, All tasks paints its first rows about 175 ms after the route change, down from about 265 ms.
  Desktop Chromium without throttling takes about 55 ms.
  [performance.spec.js](../../tests/e2e/performance.spec.js) asserts 200 ms, and the Pages workflow runs it.
- Measured but not covered by `TEC-16`, under 4x throttling with 5000 tasks:
  - A cold app start takes about 900 ms until the first rows, mostly module loading and store reads.
    Painting the first rows before the sidebar and the maintenance read the store halves the unthrottled start
    (about 370 ms down to 190 ms on a busy machine, measured side by side) and shortens the throttled one.
  - A one-task update takes about 195 ms, since the view reads the whole store again.
  - Scrolling 400 px per frame runs at a median frame of 50 ms, down from 100 ms with every row rendered.
    The cost is the eight rows that enter each frame; it is not smoother yet.
- **[Decided]** The first rows paint before the sidebar counts, the recycle bin purge, and the overdue run read the store.
  The shell is ready, `data-shell="ready"`, once they finished. The index page preloads every module (`<link rel="modulepreload">`).
- Known limitations of lists over 200 tasks:
  - Find in page sees only the rendered rows; the search field finds every task.
  - Returning to the view restores the scroll position before the rows render, so it opens at the top.
    This predates the windowing: main behaves the same.

### List
Wireframe: [list.svg](../img/ui/list.svg).

- The header shows the list name, its description, the owner and role when shared, and the actions.
  A list shared with the user shows "Shared by {{owner}} · {{role}}" under the description (`SHR-3`).
- Actions: Edit list, Edit view options, Share list, and Delete list in a More menu; no other action buttons show.
  The menu offers only what the role allows (`SHR-4`): an editor has no Share list or Delete list, and
  task editors and viewers have List details instead of Edit list.
- Edit list and List details open the list editor route; Share list opens `#/lists/{{list-id}}/share`, the same editor scrolled to its Sharing section.
- Edit view options opens the view options route (`VO-4`).
- Delete list asks for confirmation, then opens All tasks with an Undo toast (`LST-6`).
- The view options replace the order buttons and the status chip (`VO-1`); Manual order is the first sort choice (`LV-6`).
- **[Decided]** Due, Status, and A–Z sort ascending; Created and Activity show the newest first.
- **[Decided]** The order, the grouping, and the filters persist per device and per list (`TV-12`).
- Manual order is the default; rows then show a drag handle on pointer devices (`LV-2`, `LV-3`).
- A drag near the main column's top or bottom edge scrolls it; Escape or a lost pointer capture cancels the drag.
- Keyboard users move a focused row with Alt+Up and Alt+Down, and focus stays on the moved row.
  This works from any control of the row; on the status and More buttons it never opens a menu.
- A polite live region announces each move, such as "Buy paint moved to position 2 of 5."
- Moves place a task next to its shown neighbor, so tasks the status filter hides keep their places.
- **[Decided]** Compact rows keep the More button in the list view, since touch screens show no drag handle.
- Another sort affects the view only; the info line reads "Sorted by Due time" and the manual order is kept (`LV-7`).
- While sorted or grouped, drag handles and move entries are hidden; Manual order restores the stored order (`LV-8`).
- The status filter defaults to "open" (`LV-10`); the info line then reads "Status: all".
- A deleted or unknown list redirects to All tasks with a toast.
- Leaving the screen, such as with Back, closes an open Delete list dialog as Keep.
- [list.js](../../src/js/views/list.js) builds the screen; [reorder.js](../../src/js/views/reorder.js) turns moves into neighbors.

### Lists Overview
Wireframes: [lists.svg](../img/ui/lists.svg) with a few lists, [lists-many.svg](../img/ui/lists-many.svg) and [lists-find.svg](../img/ui/lists-find.svg) with 124.

- Each list row shows its name, description start, "4 open · 10 total", and sharing state (`LST-5`).
- Shared lists show the owner's name when owned by someone else.
- A floating plus button, a circle without a label, opens the list editor for a new list.
- Its accessible name and hover text are New list.
- It is fixed at the bottom right of the screen, above the bottom bar on compact layouts.
- It floats over the rows, so the list ends with room to scroll clear of it.
- It hides while an editor is open, so it never covers the editor panel.
- Wide layouts keep this screen for managing lists, though the sidebar also lists them.
- Each row links to its list; without lists, the screen says that a list groups tasks.
- A shared list shows "Shared by {{owner}}" under its name, or "Shared with 2 people" for the owner; local lists show neither (`SHR-3`).
- Rows follow the order of this device (`LST-8`); the sidebar shows the same order.
  Drag a row by its handle, or press Alt+Up or Alt+Down on a row; the rows have no Move up or Move down buttons.
  **[Decided]** The handle also shows on touch screens, since it is the only way to reorder by pointer.
  A move announces "{{list}} moved to position 2 of 5." and focus stays on the moved row's control.
- **[Decided]** Each row ends with a More button, named "List actions: {{list}}", with the menu of the list view (`LST-9`):
  Edit list, Edit view options, Share list, and Delete list, which asks first and then opens All tasks with an Undo toast.
  The menu comes from [list-actions.js](../../src/js/views/list-actions.js), shared with the List screen.
- In the sidebar, Alt+Up and Alt+Down on a focused list link move it; the sidebar has no drag handle.
- The order is the `todos.lists.order` preference, a JSON array of list identifiers, never stored or synced.
  Unknown identifiers are dropped; lists missing from it, such as new lists, follow in name order.
  [list-order.js](../../src/js/core/list-order.js) holds the helpers; another tab's change arrives as a `storage` event.
- [lists.js](../../src/js/views/lists.js) builds the screen; [reorder.js](../../src/js/views/reorder.js) drives the drag.

#### Many Lists
Design for 100 and more lists, up to 500 (`LST-10` to `LST-16`).
The sidebar and this screen share the rules below.
- **[Decided]** Find: from 12 lists, a find field sits above the rows, with the sort button and info line.
  The block follows the add bar: pinned above the bottom navigation when compact, above the rows when wide.
  Reason: a thumb reaches the bottom, and one pattern serves tasks and lists.
- **[Decided]** Matching ignores case and accents and finds the text anywhere in the name.
  This screen also searches descriptions.
  Results keep the order of the screen, with no ranking, so the order stays predictable.
  The field takes 100 characters, the length of a name.
  The rows filter once typing pauses for 150 ms (`TEC-16`).
- **[Decided]** The info line follows [Search and Add](#search-and-add): "124 lists", or "4 of 124 lists · Sorted by Name".
  A quiet Reset link ends it while the sort or the text differs from the default, and clears both.
- **[Decided]** Enter in the field opens the first match, like the sidebar field; Escape clears the text; Down moves into the rows.
  The text lasts for the session, and a Back from a list restores it with the scroll position.
- **[Decided]** No match shows "No list matches "{{text}}"." and a Create list "{{text}}" button.
  The button creates the list and opens `#/lists/{{list-id}}/edit`, as Add opens the task editor (`TSK-13`).
  It shows only for a valid new name; the floating plus keeps opening an empty editor.
- **[Decided]** Sort: a "Sort: Manual order" button opens a menu with Manual order, Name (A to Z), Open tasks (most first),
  and Last activity (newest first), where a list's last activity is the latest activity of its tasks.
  The choice persists per device in `todos.view.lists` (`TV-12`) and never changes the stored order, as for tasks (`LV-7`).
  Compact layouts show the button as an icon in the pinned bar.
  Connected with a shared list, the menu ends with a Shared only checkbox that the info line names.
  It arrives with `T0028`.
- **[Decided]** Reordering needs Manual order and an empty field, as for tasks (`LV-8`).
  Otherwise drag handles and move entries are hidden.
  Alt+Up and Alt+Down then announce "Reordering needs Manual order and no search."
- **[Decided]** Move to top and Move to bottom join the row menu while reordering is available.
  Alt+Shift+Up and Alt+Shift+Down do the same on a focused row, also in the sidebar.
  Each move announces "{{list}} moved to position 1 of 124."; focus stays on the row, which scrolls into view.
  Reason: a drag across 100 rows is slow, and the two ends cover pinning and parking a list.
  A drag keeps its edge auto-scroll, and a new list still appends at the end.
- **[Decided]** Rows stay 64 px high, and there is no density option; find and sort carry the scale.
- **[Decided]** Rendering: the sidebar renders every row, since 500 plain links are cheap.
  This screen renders every row too, each with `content-visibility: auto` and `contain-intrinsic-size: auto 64px`.
  Row menus build on first open, so 500 rows hold no 500 menus.
  Reason: unlike windowing, this keeps find in page, the tab order, and the restored scroll position true.
- **[Decided]** Budget: opening Lists takes at most 200 ms with 150 lists and 5000 tasks (`TEC-16`).
  The check runs under 4x CPU throttling.
  [performance.spec.js](../../tests/e2e/performance.spec.js) asserts it; with 500 lists the time is recorded, not asserted.
  If the 500-list time passes twice the 150-list time, a new task adds windowing as for task rows.
- **[Decided]** Counts: one shared pass builds the open and total count of every list from the tasks and memberships.
  It marks open task identifiers once, then walks the memberships once.
  The cost is tasks plus memberships, never lists times tasks.
  [list-counts.js](../../src/js/core/list-counts.js) holds it, with the newest task activity per list for the sort.
  [list-find.js](../../src/js/core/list-find.js) and [list-sort.js](../../src/js/core/list-sort.js) hold finding and sorting.
  A burst of store changes recounts once per animation frame, and both surfaces patch rows by list identifier.
- **[Decided]** Keyboard: the sidebar rows are one tab stop; Up, Down, Home, End, PageUp, and PageDown move between them.
  On this screen the rows are one tab stop too: Up and Down move between rows, Right moves to the row's More button, Left back.
  Tab and Shift+Tab leave the list; no ARIA grid role is used.
  `/` focuses this screen's field, and `l` focuses the sidebar's field, or opens this screen where there is none.
- **[Decided]** Announcements: a polite live region reads "4 of 124 lists" or "No list matches" after the rows filter,
  and "Sorted by Name" after a sort; the fields are `type="search"` and named "Find a list" (`TEC-15`).

#### Design alternatives
- **A. Find, sort, and manual order on a flat list (chosen).**
  Adds one field and one button above 12 lists, and stores nothing new but the sort choice.
- B. Pinned lists with collapsible groups, such as Pinned, Shared, and Others.
  Familiar, but it needs a stored flag that must sync, and more chrome; revisit if manual order proves too weak.
- C. Windowing the Lists screen like task rows.
  A smaller DOM at 500 lists, but it breaks find in page, the tab order, and scroll restore.
  It stays the fallback.
- D. A command palette on Ctrl+K to jump to a list.
  Quick for experts, but invisible on touch and a new component; the sidebar field with `l` is as fast.

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
  Only the task owner or the owner of a list holding the task sees Delete task.
- A deleted task opens read-only with a Restore button (`BIN-6`).
  It hides Clear, Add to list, the chip remove buttons, the add note field, and Delete task.
- [task-editor.js](../../src/js/views/task-editor.js) and [notes.js](../../src/js/views/notes.js) build it.
- Escape closes the editor, also from a text field, whose change saves first; the value saves once.
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
- A role below editor sees the name and description read-only under a banner naming the owner (`SHR-4`).
- A Sharing section follows the details; see below.
- Delete list sits at the bottom, after a divider, like Delete task.
- Deleting a list asks for confirmation and states that its tasks stay (`LST-6`, `LST-7`).
  A line under Delete list reads "Deleting a list never deletes its tasks."
- The description shows a counter, such as "36 / 1000" (`LST-2`); `aria-describedby` links it to the field.
- **[Decided]** A created new list keeps the editor on `#/lists/new`, so typing goes on without a reload of the panel.
- Details, Sharing, and Delete list appear once the new list exists.
- Closing the editor, also with Back, saves a typed valid name or description first, like the task editor.
  A field fixed after an error saves too, and closing also closes an open Delete list dialog as Keep.
- [list-editor.js](../../src/js/views/list-editor.js) builds it; the List screen's Delete list uses its dialog.

### Sharing Section
- **[Decided]** Sharing is a section of the list editor, not a separate dialog.
- It shows the owner and every person with access (`SHR-1`, `SHR-2`).
- For the owner, each person has a role select and a Remove button, and an invite row follows.
- The invite row has an email field, a role select defaulting to Task editor, and an Invite button.
- Each role option of the invite row has a one-line explanation, such as "Can add, edit, and reorder tasks".
  The role selects of the people show the role name only, with the explanation as a tooltip, to fit narrow panels.
- **[Decided]** Invite sends a sharing request (`POST /api/sharing-requests`), which also reaches an address without an account.
  The person gets access once they accept, so the status line says "Invitation sent to {{email}}." and the people list does not change.
  Pending invitations are not listed.
- **[Decided]** The service has no call that changes a role, so a role change removes the rule and adds it back with the new role.
  If the new role is refused, the old role is added back and the status line gives the reason.
- Other users see the owner and their own role, read-only, with no controls (`SHR-3`).
- Offline, every control is disabled and a banner says sharing needs a connection (`SHR-6`).
- In local mode, the section only says "Connect to share this list" and links to the connect flow.
- [sharing.js](../../src/js/views/sharing.js) builds the section; [permissions.js](../../src/js/core/permissions.js) holds the role rules (`SHR-5`).

### Recycle Bin
Wireframe: [recycle-bin.svg](../img/ui/recycle-bin.svg).

- Rows show a type icon, the name or description, and "Deleted 5 days ago · 25 days left" (`BIN-1`).
- Each row has Restore and Delete permanently (`BIN-2`, `BIN-4`).
- Delete permanently asks in the row first, with Delete and Keep buttons.
  If the delete fails, a toast says so and the question stays open with focus in it.
- Empty recycle bin sits above the rows and is hidden while the bin is empty (`BIN-7`).
  It asks in place first: "Permanently delete 1 list and 2 tasks? This cannot be undone." with Keep and Delete all.
  Escape or Keep closes the question; while connected it empties this device only, as Delete permanently does. A toast says "Recycle bin emptied." or that emptying failed, and the question stays open.
- Days left count to the exact purge time, 30 times 24 hours after the deletion.
- Restoring shows a toast linking to the restored item (`BIN-3`).
- An empty bin says that deleted items stay here for 30 days; otherwise that note sits above the rows.
- Compact rows show only the days left and an icon-only Delete permanently; the question takes its own line.

### Settings
Wireframe: [settings.svg](../img/ui/settings.svg).

Settings is one page with these sections:
- Appearance: theme as System, Light, or Dark.
- Data: Export backup, Import backup, and Delete all data (`BAK-1`, `BAK-5`, `BAK-15`).
- Delete all data is a danger button, last in Data; connected, it is disabled with the hint "Disconnect first. Deleting here never removes data from your account."
- Its dialog names the counts, offers Export backup, and enables Delete everything only after the user types DELETE, exact and case-sensitive.
  Cancel and Escape change nothing; a toast says "All data deleted."; a failure keeps the dialog open with an error toast. The theme and server URL stay.
- Connection, when local: a short explanation of connected mode and a Connect button.
- Connection, when connected: account name and email, server, sync state, Sync log, and Disconnect.
- Connection also holds the server URL, changeable only while disconnected (`CON-12`).
- About: app version, build date, the keyboard shortcuts, and a link to the requirements and source.
  The shortcut list names each key in a `kbd` and lists only shortcuts that work today.
  A task that adds a shortcut adds its row to `SHORTCUTS` in [settings.js](../../src/js/views/settings.js).
  [version.js](../../src/js/version.js) holds both; a unit test matches the version to package.json.
- The theme applies at once; a theme the browser cannot store shows a toast saying it lasts until reload.
- Connect opens the connect screen; connected, the section shows "Signed in as {{name}} ({{email}})" and the server.
- Connected, the section also shows the sync state and a Sync log link.
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
- Opening the sync log clears the sync indicator dot, and it stays clear while the screen is open.
- An entry about an item shows the task description or the list name; a deleted or unknown item shows a plain label.
- An empty log reads "Nothing to show." and the screen ends with "Entries stay for 30 days."
- Entries render as text only, so a lost value can be copied back by hand.

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
2. New list on the Lists screen, its Create list offer, or the editor's Add to list box creates a list.
3. The editor's Lists section adds a task to several lists; the row menu adds one list at a time.
4. In a list with manual order, the user drags rows or uses Move up and Move down.
5. Every step works offline; the user menu stays at Local only.

### Connecting
Wireframe: [connect.svg](../img/ui/connect.svg).

1. The user opens Settings and selects Connect, or the Local only indicator.
2. The connect screen explains the gains, the loss of anonymity, and the invitation-only access (`CON-2`).
3. Sign in sends the browser to the Auth service; it returns to `#/connect` with a session.
   The screen names the server; a code from a sign-in this device did not start shows "Sign-in did not finish."
4. A user without an invitation sees a page saying access is by invitation only, and stays local (`CON-3`).
   **[Decided]** Until sync lands, the screen ends at "Signed in as {{name}} ({{email}})" with Done.
   The card's polite live region reads each result once; focus then moves to Done, Sign in, or Back to Settings.
5. On success, the screen shows upload progress: "Uploading 5 lists and 34 tasks" (`CON-4`).
6. It names merged lists, such as "Your list Home merged with your account's Home" (`CON-5`).
7. It downloads the account's data, then shows Done and returns to All tasks (`CON-6`).
8. An interruption keeps the screen resumable; restarting the upload creates no duplicates (`SYN-10`).

### Syncing
1. Each change applies locally and the indicator turns to Syncing, then Synced (`SYN-1`).
2. Offline, the indicator shows Offline with the pending count, and work continues (`SYN-2`).
3. Back online, the queue syncs without user action, and remote changes appear in place (`SYN-3`).
4. A failing sync shows Sync error; its popover names the error and offers Retry.
5. Open tabs sync as one: one tab holds the lock, uploads, and polls; the others show its state (`SYN-12`).
6. A feed cursor the service no longer knows keeps the queue and fetches a fresh snapshot, without a message.
7. A service that refuses the app version, or a feed protocol the app does not know, turns the indicator to Update required (`SYN-11`).

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
   Settings and the connect screen show it too.
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

1. The user selects Import backup and picks a file in the Backup file field, which has focus.
   On phones this is the main view with an Import backup header and close button; wide screens show a dialog.
2. An invalid file shows the reason under the field, keeps Import disabled, and changes nothing (`BAK-13`).
3. A valid file shows its name, export date, and counts, and the mode choice: Merge or Overwrite (`BAK-5`).
4. Merge is the default; Overwrite explains that missing own items move to the recycle bin (`BAK-9`).
5. The dialog shows the counts of added, updated, and binned items for the chosen mode (`BAK-11`).
   They update when the mode changes; overwrite adds "N removed" when it deletes memberships or notes.
6. Import applies the change and a toast repeats the counts; Cancel, Close, and Escape change nothing (`BAK-12`).
   The actions follow the dialog component: Cancel, then Import at the end.
7. When connected, the dialog notes that lists of other owners stay unchanged (`BAK-10`).
8. When connected, Overwrite is disabled with the reason "Replacing data is not available while connected: an import never removes data from your account."
   Merge queues its changes for upload, and Import then leaves the dialog open on the counts and a sync line (`BAK-6`).
   The line reads "Syncing N changes…", then "Synced."; offline, sign-in needed, and failures show their own text.
   Done closes the dialog and a toast repeats the counts; Close and Escape also work, and syncing continues.

---

## Accessibility and Input
- Every screen works with keyboard alone, in a logical tab order (`TEC-15`).
- Shortcuts: `n` and `/` focus the add and search field, and Escape closes the editor or a dialog.
- Shift+Enter or Alt+Enter in the add and search field adds the typed task, like the Add button.
- On the Lists screen `/` focuses the find field; `l` focuses the sidebar's find field, or opens Lists where there is none.
- Alt+Up, Alt+Down, Alt+Shift+Up, and Alt+Shift+Down move a focused list by one place or to an end.
- `n` and `/` both focus the view's `[data-shortcut~="add"]` element, the add and search field, and do nothing without it.
- Ctrl+Z or Cmd+Z, outside text fields and modal dialogs, runs the Undo of the newest toast.
  It never runs another toast action, such as Reload.
- Page shortcuts never fire while a text field has focus; the add field's keys and Escape in an editor do.
- The About section lists every shortcut that works today.
- Drag and drop always has a keyboard alternative: Move up and Move down for tasks (`LV-3`), Alt+arrows and menu entries for lists.
- Status, overdue, and sync state never rely on color alone: each has an icon and a text label.
- Touch targets are at least 44 by 44 px, including chips and row buttons.
- Focus moves to the editor's description when it opens, and back to the row when it closes.
  After an add from the add field on a wide layout, focus stays in the add field (`TSK-13`).
- Live regions announce toasts, sync state changes, and moved rows.

---

## Wireframes
The [ui wireframes](../img/ui/) show each screen at 390 px and 1440 px side by side.
They are low fidelity: gray boxes and placeholder text, without the design system's colors or fonts.
[draw-wireframes.py](../../scripts/draw-wireframes.py) draws them; regenerate them after changing a screen, as [devops.md](../devops.md) describes.
