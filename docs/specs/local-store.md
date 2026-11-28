# Local Store
The IndexedDB schema that holds the app's data in the browser.
[db.js](../../src/js/store/db.js) opens it and exposes the store operations; [idb.js](../../src/js/store/idb.js) holds the shared helpers.

---

## Database
- Name: `todos`; one database per browser profile (`LOC-5`).
- Version: 6; `upgrade()` in db.js creates or migrates the stores, one version step at a time.
- Version 1 created `lists`, `tasks`, and `memberships`; version 2 adds `notes` and keeps existing data.
- Version 3 gives existing memberships a `position`, per list in added-time order, then by task id.
- Version 4 adds the sync stores `sync-queue`, `sync-state`, and `sync-log`; existing stores and data stay unchanged.
- Version 5 adds `occurrences` and `events`; [migrate.js](../../src/js/store/migrate.js) converts the data like the todos.server migration:
  - Each task gets default one-off rules with its due time and overdue handling, and occurrence 1.
  - `todo` becomes `ready`; `in-progress` adds a `start` event; `completed` adds a `complete` event, count 1, and closes.
  - `cancelled` adds a `cancel` event and closes; every task gets a `create` event at its creation time.
  - Status events and close times take the task's `last-update-time`.
  - `last-update-time` takes the later of it and `last-activity-time`, which goes.
  - Notes rename `author` to `owner-id` and `edit-time` to `last-update-time`, and get `occurrence` null.
  - Queued task changes become `update-rules` and `post-event` entries, appended after the queue.
- Version 6 adds goals, the log, and the `failed` status, as ADR-0006 of todos.server says; see Store Upgrade.
  It adds no store and no index; it rewrites the records of `tasks`, `occurrences`, `events`, and `sync-queue`.
  - Implemented so far: the goal fields on rules and occurrences, as the first two Store Upgrade bullets say.
    `target-count` and `completion-count` stay as mirrors of `goal-target` and `progress`; the store keeps them equal on every write.
    Events, statuses, and queued changes stay as in version 5, and the goal fields stay out of sync payloads and backups until later tasks.
- Records use the field names of the service's `List`, `Task`, `Note`, `Occurrence`, and `TaskEvent` schemas, in kebab-case.
- Times are ISO-8601 strings in UTC with milliseconds, such as `2026-11-04T09:00:00.000Z`.
- Identifiers are UUIDv7 strings from [uuid7.js](../../src/js/lib/uuid7.js), sorting by creation time (`TEC-9`).

---

## Stores

### `lists`
Keyed by `id`.
- `id`, `name`, `description`, `owner`.
- `creation-time`, `last-update-time`, `deletion-time`.
- `owner` is null for local lists; connected mode fills it from the service.

### `tasks`
Keyed by `id`.
- `id`, `description`, `owner-id`, `lifecycle-rules`, `current-occurrence`.
- `creation-time`, `last-update-time`, `deletion-time`.
- `lifecycle-rules` and `current-occurrence` match the service's `LifecycleRules` and `Occurrence`, without `task-id`.
- `lifecycle-rules` holds the window and goal fields (see Goals).
- `current-occurrence` also embeds `entries`: its live `log` events, oldest first.
- `upcoming` is computed, never stored: the current moment lies before occurrence 1 starts.
- `last-update-time` changes with every change of the task, its rules, events, memberships, and notes (`TSK-12`, `NOT-5`).

### `occurrences`
Keyed out of line by `[task-id, occurrence]`; added in version 5.
- The service's `Occurrence` fields: `task-id`, `occurrence`, `start-time`, `due-time`, `status`, `close-time`.
  - The goal snapshot: `goal-direction`, `goal-measure`, and `goal-target`.
  - The cache: `progress`, a number or null, and `time-spent-seconds`, a whole number from 0.
  - `target-count` and `completion-count` are gone.
- Every write of a task also writes its current occurrence here.
- A local roll-over, and a grace event in local mode, also write past occurrences of recurring tasks here.

### `events`
Keyed out of line by `[task-id, id]`; added in version 5.
- The service's `TaskEvent` fields: `id`, `task-id`, `occurrence`, `creation-time`, `owner-id`, `type`, `details`.
  - Log fields: `checked`, `time-spent-seconds`, `amount`, `label`, and `target-event-id`.
  - A `log` event holds at least one of `checked`, `time-spent-seconds`, and `amount`; only `undo-log` has a `target-event-id`.
  - `details` holds the changes of edit events only.
- Local events: `create`, the user events, `expire`, `edit-lifecycle-rules`, `roll-over`, and `end-recurrence`.
  The user events are `log`, `undo-log`, `start`, `unstart`, `cancel`, and `reopen`.
- Synced tasks hold only the events made on this device; system and rule edit events never join the change queue.

### `memberships`
Keyed out of line by `[list-id, task-id]`, since IndexedDB key paths cannot hold dashed names.
- `list-id`, `task-id`, `position`, `added-time`; `position` was added in version 3.
- The key order lets one key range read all memberships of a list.
- `position` is a fractional-index key; a list shows its tasks in ascending position order (`LV-2`).

### `notes`
Keyed out of line by `[task-id, id]`, for the same reason; added in version 2.
- `id`, `task-id`, `text`, `owner-id`, `occurrence`, `creation-time`, `last-update-time`.
- `owner-id` is null for local notes; `last-update-time` equals `creation-time` until the first edit.
- `occurrence` numbers the occurrence the note belongs to, or is null for a global note (`NOT-6`).
- The key order lets one key range read all notes of a task.
- Editing or deleting by note id scans the keys only, matching the second key part.

### `sync-queue`
Keyed by `seq`, auto-incremented; holds the change queue (see Sync Queue).

### `sync-state`
Keyed by `key`, with the record `{key, value}`.
- `account`: `{email, server}` of the account whose local data was adopted.
- `adoption`: `{status: running|done, account, done, total}`; the step count lets an interrupted upload resume.
- `list-map`: local list id to account list id, for local lists merged into account lists.
- `cursor`: `{account, value}`, the opaque cursor of the change feed for one account and server.
- `user-id`: the connected user, from `/api/users/me`; it tells own lists and tasks from those of others.
- `last-account`: `{email, server}` of the account this device was last connected to; disconnecting saves it, and it stays.
- `pending-erase`: `{time, account}`, a Delete all data done in local mode that the account has not heard of yet (`BAK-15`).
  `account` is `last-account` at the time, or null on a device never connected. A later local erase replaces `time` and keeps `account`.
- Disconnecting clears `cursor`, `user-id`, `account`, `adoption`, and `list-map`, and saves `last-account`.
  A queued `erase` entry becomes `pending-erase` with that entry's time, so the erase survives the disconnect.

### `sync-log`
Keyed by `id`, with an index on `time`; records of what sync changed or refused, kept for 30 days for the Sync log screen (`SYN-8`).
- `{id, time, kind: 'rejected', operation, target, fields, status, message}`: a change the service refused and the app undid.
- `{id, time, kind: 'overwritten', target, field, sent, kept, kept-edit-time}`: a value the merge overwrote.
- `{id, time, kind: 'lost-access', target, name, undone, message}`: a list the user lost access to.
- `{id, time, kind: 'error', message, detail}`: a failed sync run; a repeat of the same failure is logged once.
- Every pull run first removes the records older than 30 days (`queue.purgeLog`).

---

## Device Preferences
- `todos.view.panels` holds `{sidebar, editor}`, the widths of the lists sidebar and the task editor panel in rem.
- Values outside 12 to 24 for the sidebar and 20 to 40 for the editor, or unreadable entries, fall back to 16 and 25.
- The entry stays on the device and never syncs (`SYN-13`).
- `todos.view.nav` holds the wide sidebar state of the nav toggle: `"open"`, `"rail"`, or `"hidden"`.
- A missing, unreadable, or unknown value means `"open"`; the entry stays on the device and never syncs (`SYN-13`).

## Rules
- List names are unique per owner, ignoring case and surrounding spaces, including lists in the recycle bin (`LST-3`).
- List names hold 1 to 100 characters, descriptions at most 1000 (`LST-1`, `LST-2`).
- Task descriptions hold 1 to 500 characters after trimming surrounding spaces (`TSK-1`).
- A date-only due time, such as `2026-11-08`, is stored as 23:59 local time on that date (`TSK-6`).
- New tasks get default one-off rules, an `at-least` goal of 1 check and overdue handling `keep`, and a `ready` occurrence 1 (`TSK-2`).
- Note texts hold 1 to 2000 characters after trimming surrounding spaces (`NOT-1`).
- A task lists its notes newest first, by creation time, then by identifier (`NOT-3`).
- Adding, editing, or deleting a note sets the task's `last-update-time` (`NOT-5`).
- Note links follow the todos.server business logic spec, Notes and Occurrences (`NOT-6`):
  - `addNote` without `occurrence` takes the newest occurrence that began by the creation time.
    That occurrence counts only while its period still runs at the creation time.
  - A one-off task, or a time in no period, keeps the note global; `occurrence: null` keeps any note global.
  - `editNote(id, {text, occurrence})` changes the text, the link, or both; a plain string changes the text.
  - In local mode a recurring task rolls over before a note links to it.
  - A link below 1 throws a `ValidationError`.
  - A link past the current occurrence throws a `StoreError` with code `conflict`.
- An unknown task or note throws a `StoreError` with code `not-found`.
- Invalid input throws a `ValidationError` naming the field and the rule, and stores nothing.
- Every write runs in one transaction, so a failure leaves no partial change.

---

## Recycle Bin
[bin.js](../../src/js/store/bin.js) uses the existing `deletion-time` fields and needs no schema change.
- Deleting a list or task sets its `deletion-time` and `last-update-time`.
- Memberships stay stored, so restoring a list or task brings them all back (`BIN-3`).
- A deleted list is hidden from `listLists` and `listsOfTask`, and `tasksOfList` returns no tasks for it.
- A deleted list's tasks stay in their other lists, or in no list, and keep their activity time (`LST-6`, `LST-7`).
- A deleted task is hidden from `listTasks` and `tasksOfList`; `getTask` and `notesOfTask` still read it (`TSK-11`).
- Changes to a deleted list or task throw a `StoreError` with code `deleted` (`BIN-6`).
  - Lists: `updateList`, `addToList`, `removeFromList`, `moveInList`, and `createTask` into that list.
  - Tasks: `updateTask`, `addToList`, `removeFromList`, `moveInList`, and every note change.
- `listBin` returns entries with `type`, `id`, `name` or `description`, `deletion-time`, and `purge-time`, newest first.
- `purge-time` is 30 days after `deletion-time`; restoring later throws code `expired` (`BIN-2`).
- `purgeForever(type, id)` removes a bin entry and its memberships, and a task's notes, occurrences, and events (`BIN-4`).
  While connected it also queues a purge for the account, see Sync Queue.
- Restoring keeps each membership's `position`, so the task returns to its place in every list.
- `purgeExpired(now)` removes every entry deleted more than 30 days ago in one transaction (`BIN-5`).
- `emptyBin()` permanently removes every bin entry, with memberships and notes, in one transaction and returns the purged `{type, id}` entries (`BIN-7`).
- `restoreEntries(entries)` restores the given `{type, id}` entries with memberships in one transaction (`BIN-9`).
  It skips expired, missing, and not deleted entries, and returns `{restored, skipped}`.
- `purgeEntries(entries)` permanently removes the given entries as `purgeForever` does, in one transaction, skipping missing or not deleted ones, and returns the purged `{type, id}` entries (`BIN-9`).
- Restoring or purging an entry outside the bin throws code `not-deleted`.
- `deleteAllData()` clears lists, tasks, memberships, and notes, including bin entries, in one transaction and returns `{lists, tasks}` counts (`BAK-15`). While connected it also queues an account erase, see Sync Queue.
  In local mode the same transaction saves `pending-erase` in `sync-state`; the other sync state stays. The app offers it in every mode.

---

## Lifecycle
[occurrences.js](../../src/js/core/occurrences.js) runs the todos.server status rules locally, so local mode keeps every feature (`LOC-2`).
- Statuses are `ready`, `in-progress`, `completed`, `failed`, and `cancelled`; a task's status is that of its current occurrence.
  - `failed` only appears on closed occurrences.
  - `cancelled` only means that the user dropped the task.
- The fold applies events in `creation-time` order, then by `id`, and ignores an event whose precondition fails at its place.
- A one-off occurrence closes on `completed`, `failed`, or `cancelled`, and reopens when it leaves them (see Closing One-Off Occurrences).
- `postEvent(id, type)` posts `start`, `unstart`, `cancel`, or `reopen` with a UUIDv7 and the client time.
  A failing precondition throws a `StoreError` with code `conflict`.
- `logEntry(id, {checked, timeSpentSeconds, amount, label})` posts one `log` event and returns it (see Log).
- `undoEntry(id, entryId)` posts an `undo-log` event for that entry (see Log).
- `postEvent(id, 'complete')` and `postEvent(id, 'uncomplete')` stay as aliases of a checked `log` and an `undo-log` of the live check.
  `uncomplete` without a live check throws a `conflict` StoreError.
- `updateRules(id, edit)` edits the rules; goal, start time, and due time edits move the open occurrence.
- A recurring task keeps `due-time` and `overdue-handling` null, in `createTask`, `updateRules`, and backup imports alike.
  A one-off task keeps the recurrence fields and `timezone` null, with overdue handling `keep` by default.
- `updateTask(id, changes)` keeps the status edit of the current views and maps it onto events (`TSK-4`).
  - `completed` posts a checked `log`, `cancelled` posts `cancel`, and `in-progress` posts `start`.
  - Going back posts an `undo-log` of the live check, `unstart`, or `reopen`.
  - `failed` is never set by hand; the fold or an `expire` sets it.
  - `due-time` and `overdue-handling` edit the rules.
- `eventsOfTask(id)` and `occurrencesOfTask(id)` read a task's events and occurrences.
- `updateRules` also stores an `edit-lifecycle-rules` event with the old and new values of each changed field.

### Recurrence
[periods.js](../../src/js/core/periods.js) computes periods as the todos.server business logic spec says, section Periods.
- A period spans `recurrence-interval` units of `day`, `week`, `month`, or `year` in the rule's IANA `timezone`.
- Days start at local midnight, weeks on Monday, months on the 1st, and years on 1 January; periods are half-open.
- A skipped local midnight starts at the first valid instant of its day; units add in local dates.
- The period after a period starts at its end, so a unit or timezone edit applies from the next period.
- [periods.test.js](../../tests/unit/periods.test.js) runs every case of [recurrence-test-vectors.json](../../tests/fixtures/recurrence-test-vectors.json).
  The file copies todos.server `docs/specs/recurrence-test-vectors.json`; refresh it by hand when the server's copy changes.
- A recurring occurrence covers one period: its `start-time` and `due-time` bound it, and it stays open at target.
- Occurrence 1 covers the period containing the creation time, or the one containing `start-time` when the rules have one.
  Making an open one-off task recurring turns its occurrence into the period containing the edit.
  Making a closed one recurring opens a fresh occurrence; stopping recurrence drops the occurrence's due time.
- `createTask` and `updateRules` refuse a recurring rule without `recurrence-interval` or a known `timezone`.

#### Roll-Over
- **[Decided]** In local mode the store rolls a task over before each event and rule edit, as the server does.
  The minute timer of [overdue.js](../../src/js/core/overdue.js) also rolls every recurring task over (`LOC-2`).
- `rollOverTask(id)` closes each occurrence whose period ended with a `roll-over` event at its due time.
  Missed periods become occurrences with progress 0 and status `ready`, until the current period covers now.
  The verdict of each closed occurrence follows Closing Recurring Occurrences.
- When the end count or end date is reached, `end-recurrence` closes the last occurrence instead, with the same verdict.
  The end date is a local date: the recurrence ends when the next period would start after it.
- A closed recurring current occurrence, whatever its status, takes only `reopen`; other user events fail.
  The `reopen` opens a fresh period containing now, unless the end rules allow none, as after `end-recurrence`.
- Folding a recurring occurrence applies its `roll-over` or `end-recurrence` event last, as the server's fold does.
- **[Decided]** While connected, the store never rolls over; `rollOverTask` returns null and the service rolls over.

#### Display Rule
- A recurring task past its period end, not rolled over yet, shows as `ready` with progress 0 (`displayTask`).
  A `reading` goal shows its carried reading as progress.
- All tasks and the list view apply it before they filter, sort, and group, so such a task shows under the open filter.
  Their minute tick renders again when a task passes its period end (`becameStale`).
- Rows and the editor's status apply it; the editor takes an injectable clock.
- `countLists(tasks, memberships, now)` counts such a task as open; the sidebar counts refresh every minute.
- **[Decided]** A connected event on such a task joins the period covering now, computed locally.
  It goes to the service without `occurrence`, so the service assigns the period containing its time.

#### Grace Entries
- For 24 hours after a period ends, `logEntry(id, entry, {occurrence})` may name that period's occurrence.
  The `complete` alias accepts `occurrence` the same way.
- `graceOccurrence(task, now)` names it: the cached occurrence past its period end, or the previous one after a roll-over.
- In local mode the event joins the stored occurrence with a time just before its due time, and the occurrence folds again.
  It stays closed and keeps its close time; the current occurrence does not change.
- While connected the queue posts the event with the named `occurrence`, and the service checks the grace period.
- `cancel` and `reopen` never name a past occurrence; a closed grace period throws a `conflict` StoreError.
- The precondition holds against the past occurrence before its period ended, as the server checks it.
- Undoing a queued event restores the task by its mode: a grace event leaves the current occurrence alone.
  An event that opened another occurrence, such as a recurring reopen, gives back the whole occurrence before it.

---

## Goals
`lifecycle-rules` holds the window and goal fields of the todos.server `LifecycleRules`; every task has them.
- `start-time`: an optional time; before it, the task is upcoming.
  - Occurrence 1 starts at `start-time`, or without one at the task's creation time (one-off) or at the start of the unit containing it (recurring).
  - A recurring occurrence 1 that starts at `start-time` ends with the period containing it, so its first period is shorter.
  - `start-time` must lie before `due-time` and before the recurrence end date.
  - A `log` or other event before the start of occurrence 1 throws a `conflict` StoreError.
- `recurrence-unit` is `day`, `week`, `month`, or `year`.
- `overdue-handling` is `keep` or `fail`, and applies to `at-least` goals only.
- `goal-direction`: `at-least` (default) or `at-most`.
- `goal-measure`: what the goal counts, over the live entries of an occurrence.
  - `checks` (default): the number of applied checks.
  - `time`: the sum of applied `time-spent-seconds`.
  - `amount`: the sum of applied amounts.
  - `reading`: the latest applied amount, such as a weight.
- `goal-target`: the number to reach or stay within.
  - A whole number from 1 to 999,999,999,999 for `checks` and `time`.
  - A decimal from 0 to 999,999,999,999.999, with at most 3 decimals, for `amount` and `reading`.
- `goal-unit`: a label of up to 20 characters, such as `kcal`; only `amount` and `reading` goals have one, others keep it null.
- An `at-most` goal needs a window end: a `due-time` or a recurrence.
- Goals have no start value: sums start at 0, and readings carry forward.
- The defaults are today's simple task: `at-least`, `checks`, target 1.
- Amounts, targets, and totals are JSON numbers; the store computes in whole thousandths, so sums stay exact.
  A decimal total stays below 10^15 thousandths, and a `time-spent-seconds` total at or below 999,999,999,999.
- `createTask` and `updateRules` throw a `ValidationError` naming the field for any broken rule above.

### Rule Edits
- A goal edit updates the open occurrence's snapshot and refolds it; closed occurrences keep their snapshot, so past verdicts keep their goals.
- A measure edit reinterprets the live entries of the open occurrence; the entries never change.
  Readings carry forward only into occurrences whose measure is `reading`.
- A `start-time` edit applies only while occurrence 1 is the only occurrence, is open, and holds no user events.
  It moves the start of occurrence 1; a recurring occurrence 1 also takes the end of the period containing the new start.
  Otherwise the edit throws a `conflict` StoreError.
- Local mode keeps the unit edit rule: the next period applies the new unit.

---

## Log
Every entry is one append-only `log` event; the store never edits or removes it.
- A `log` holds at least one of `checked`, `time-spent-seconds`, and `amount`, plus an optional `label`.
  - `checked`: true when the entry checks the task off once.
  - `time-spent-seconds`: a whole number from 1 to 2,147,483,647.
  - `amount`: a decimal from 0 to 999,999,999,999.999, with at most 3 decimals.
  - `label`: an optional text of up to 100 characters after trimming, such as "Croissant".
- An occurrence's `time-spent-seconds` total stays at or below 999,999,999,999; a `log` that would pass it throws a `conflict` StoreError.
- Durations have no other limit; the interface asks for confirmation above 12 hours.
- An `undo-log` cancels one `log`, named by its `target-event-id`.
  - The target must be a stored `log` of the same task; otherwise the post throws a `conflict` StoreError.
  - A second undo of the same target is accepted and changes nothing.
  - An undo never targets an undo, so chains cannot form.
  - The undo joins the occurrence of its target.
- A check is a `log` with `checked: true`; unticking is an `undo-log` of that entry.
- The time spent on a task is the sum of its live `time-spent-seconds`, whatever its goal.
- Any user who may edit the task may undo any entry; events keep their `owner-id`.
- `start` and `unstart` stay: they say "I have begun" before anything is logged.
- Connected, a `log` and an `undo-log` join the change queue as `post-event` entries with their identifiers.
- Store actions:
  - `logEntry(id, {checked, time-spent-seconds, amount, label}, {occurrence})` validates the fields, throws a `ValidationError` naming the field or `entry`, and writes a `log`.
  - `undoLog(id, targetEventId)` writes an `undo-log` that joins the occurrence of its target.
  - Both join the current occurrence, or the previous one of a recurring task within its grace period, and return `{event, task}`.
  - `postEvent(id, 'complete')` writes a checked `log`, and `postEvent(id, 'uncomplete')` an `undo-log` of the latest live check, or throws a `conflict` StoreError without one.
    `createTask` and `updateTask` write their status events the same way.
  - The current occurrence embeds `entries`, its live `log` events oldest first; the `occurrences` store keeps no `entries`.
  - A time total above 999,999,999,999 seconds throws a `conflict` StoreError.

---

## Fold
[occurrences.js](../../src/js/core/occurrences.js) computes an occurrence's cache as a pure function of its goal snapshot, its events, and any carried reading.
- Step 1: collect the occurrence's `log` events, minus those named by an `undo-log` of the task; these are the live entries.
  An undo's own time never matters.
- Step 2: order the live entries and the other non-undo events by `creation-time`, then by `id`.
  In a recurring occurrence, the period-end event goes last.
- Step 3: start open, at status `ready` and progress 0 for sums and checks.
  A `reading` goal starts at the carried reading, or null.
- Step 4: apply each event in order; an event whose precondition fails at its place is ignored.
  - A checked `log` applies its check unless the status is `cancelled`.
  - The time and amount of a `log` apply in every status, also when its check is ignored.
  - `start` needs `ready`; `unstart` needs `in-progress`, no applied entry, and progress 0 or null.
  - `cancel` needs any status but `cancelled`.
  - `reopen`, `expire`, `roll-over`, and `end-recurrence` follow the closing rules below.
- Step 5: after each `log`, `start`, `unstart`, or `reopen`, the status follows from progress.
  This applies to open occurrences, and to a one-off occurrence closed as `completed`.
- **[Decided]** An undo is retroactive: the fold treats the entry as never logged.
  A `start` that the entry blocked at its place can thus apply after the undo.
- Progress follows the measure: the number of applied checks, the sum of applied times or amounts, or the latest applied amount.
  `time-spent-seconds` always holds the sum of applied times.
- Status from progress:
  - `at-least`: `completed` at or above the target.
  - Otherwise `in-progress` when an entry or a `start` has applied in this occurrence.
  - Otherwise `ready`.
  - For a `reading` goal, only the occurrence's own live readings count while it is open; a carried reading alone leaves it `ready`.
  - An open `at-most` occurrence is never `completed` or `failed`; the interface shows it above its target as over the limit.
- `tests/fixtures/fold-test-vectors.json` holds event sequences with their expected caches.
  The file copies todos.server `docs/specs/fold-test-vectors.json`; refresh it by hand when the server's copy changes.
  The occurrences unit test runs every case.
- `foldLog({goal, recurring, events, carriedReading})` runs the fold above and returns `entries`, `progress`, `time-spent-seconds`, `status`, `close-time`, and `carried-reading`.
  Sums run in whole thousandths. `foldInPlace({target, recurring, events})` folds `complete` and `uncomplete` events, or a checked `log` and an `undo-log` at its own place, with the new verdicts; the store upgrade uses it to verify each occurrence.
- The store refolds with `foldLog` whenever a `log` or `undo-log` joins an occurrence, and keeps the live entries in the cache.
  The former functions still apply `start`, `cancel`, `reopen`, and the closing events, and count a checked `log` like `complete` and an `undo-log` like `uncomplete`; they also accept `failed`, which `reopen` opens again.
  An occurrence that holds an imported `complete` or `uncomplete` folds the former way until a later task converts imports.

### Closing Recurring Occurrences
- A recurring occurrence stays open until its period ends, or until `cancel`.
- At its period end, `roll-over` or `end-recurrence` gives the verdict from the progress, including a carried reading:
  - `at-least`: `completed` at or above the target, else `failed`.
  - `at-most`: `completed` at or within the target, else `failed`.
  - **[Decided]** An `at-most` sum with nothing logged has progress 0, so it ends `completed`.
  - A `reading` goal with progress null ends `failed`.
- `reopen` keeps its preconditions for recurring tasks.

### Closing One-Off Occurrences
- An `at-least` occurrence closes when it becomes `completed`, at that event's time.
  - Later logs on it still add checks, time, and amounts; it stays `completed`.
  - When progress falls below the target, it reopens.
- `cancel` closes an open one-off occurrence as `cancelled`; on a closed occurrence it throws a `conflict` StoreError.
  `reopen` opens it again.
- At its `due-time`, `expireTask` writes `expire` once per occurrence, by goal:
  - `at-least` under `keep`: no `expire`; it stays open and overdue.
  - `at-least` under `fail`, below target: `failed`, and closed.
  - `at-most`: `completed` at or within the target, else `failed`, and closed.
- `reopen` also accepts an `at-least` occurrence that `expire` failed.
  It then stays open and overdue, since `expire` never repeats for an occurrence.
- An `at-most` occurrence closed by `expire` cannot be reopened; undoing entries changes its verdict instead.
- An occurrence reopened after `cancel` gets its `expire` later, when its deadline has passed.

### Readings Carry Forward
- An occurrence's own reading is its latest live reading, in fold order.
- An occurrence without its own reading takes the reading of the previous occurrence, and so on; the first falls back to null.
- A live reading always takes effect, since amounts apply in every status.
- Logging or undoing a reading refolds that occurrence and the later ones.
  The refold stops at the first later occurrence whose own reading, after its refold, decides its progress.
- The fold vectors include an undone reading and a reading on a log whose check is ignored.
- `entries` holds only live entries of the current occurrence; entries of past occurrences come from `eventsOfTask`.

### Late Entries
- A `log` joins the occurrence containing its `creation-time`, under Grace Entries and the service's late limit.
- A late entry within the limit refolds a closed occurrence, also its verdict.
- An `undo-log` is subject to the late limit of its target's occurrence, unless it is imported.

---

## Store Upgrade
Version 6 runs once, in the `upgrade()` transaction; [migrate.js](../../src/js/store/migrate.js) holds the conversion, as todos.server does for its schema.
- Rules: `target-count` N becomes an `at-least` goal of N `checks` with `goal-unit` null and `start-time` null; `overdue-handling` `cancel` becomes `fail`.
- Occurrences: the same goal snapshot per occurrence; `completion-count` becomes `progress`, and `time-spent-seconds` is 0.
- Events: refold each occurrence with the old fold first, noting which events applied and which event closed it.
  - Each `complete` becomes a checked `log` with the same `id`, time, and owner.
  - Each applied `uncomplete` becomes an `undo-log` of the latest check live at its place.
  - An `uncomplete` the old fold ignored is dropped, and the upgrade counts it.
- Status: the closing event decides.
  - `expire` gives `failed`; `end-recurrence` below target gives `failed`.
  - A `roll-over` that closed `ready` or `in-progress` gives `failed`.
  - A user `cancel` keeps `cancelled`, and `completed` stays `completed`.
- The upgrade verifies each occurrence with an in-place fold, which applies each `undo-log` at its own place.
  It must reproduce the old count, the mapped status, and the close time; a mismatch aborts the transaction and keeps version 5.
  The open then fails with an `upgrade-failed` StoreError that names the occurrence, and the console shows the cause.
- The real fold then runs with retroactive undo; occurrences where it differs keep its result, and the upgrade counts them.
  The current occurrence of each task with events embeds its live `entries`.
- An occurrence without events keeps its stored cache.
- The conversion runs after the version 5 and goal field steps, for every database older than version 6; a database already at version 6 is not converted.
- Queued entries convert in step:
  - A queued `post-event` of `complete` or `uncomplete` keeps its type, since the service accepts both as aliases.
  - A queued `update-rules` of `target-count` becomes `goal-target`; `cancel` for `overdue-handling` becomes `fail`.
    Its undo data keeps `target-count`, which the store still applies.
- The upgrade writes no sync log record; the console shows the counts of refolded occurrences, converted events, dropped uncompletes, and occurrences refolded differently.
- Older web apps cannot read version 6; the open fails with a `blocked` or version error, and the app asks to update.

---

## Overdue Handling
[overdue.js](../../src/js/core/overdue.js) computes the flag and expires overdue tasks through the store facade.
- `isOverdue(task, now)` is true when the current occurrence's `due-time` is before `now` and it is `ready` or `in-progress` (`OVD-1`).
  An `at-most` occurrence is overdue only before `expire` closes it, since the hourly run closes it at its due time.
- `applyOverdueHandling(store, now)` writes an `expire` event via `expireTask` for each overdue `fail` task with an `at-least` goal, and for each overdue `at-most` task (`OVD-4`).
- The `expire` event never joins the change queue, since the service writes its own on its hourly run.
- It never changes deleted, `completed`, `failed`, or `cancelled` tasks (`OVD-6`).
- `startOverdueTimer` runs it once on start, then every minute; the returned function stops it (`OVD-5`).
- With `rollOver()` true, each run first rolls recurring tasks over through `applyRollOver`; the app passes local mode.
- A recurring task is never overdue: its due times end periods.

---

## Manual Order
[fractional-index.js](../../src/js/lib/fractional-index.js) generates the positions.
- Keys follow the base-62 rocicorp fractional-indexing algorithm, like the service's `list-memberships.position`.
- Keys compare by code unit order, which equals byte order for their ASCII digits.
- The keys match the service's `FractionalIndex` class, so local and service positions mix.
- `keyBetween(a, b)` returns a key strictly between two keys; null stands for an open end.
- `keysBetween(a, b, n)` returns `n` evenly spread keys between two keys.
- `validateKey(key)` throws a `RangeError` for a malformed key; `isValidKey(key)` returns a boolean instead.
- A task added to a list, also through `createTask(..., {lists})`, goes after its last task (`LV-5`).
- `moveInList(taskId, listId, {before | after})` places a task directly before or after a neighbor.
  - Exactly one neighbor is required; it must be another member of the same list.
  - Otherwise the move throws a `ValidationError`; a task outside the list throws `not-found`.
  - A deleted task or list throws `deleted`.
  - Only the moved membership changes; other lists of the task keep their order (`LV-4`).
  - The move sets the task's `last-update-time`.
- A rebalance gives the whole list keys `a0`, `a1`, and so on, keeping its order.
  - It runs before a new key would exceed 128 characters, the service limit.
  - It also runs when the neighbors share a position, such as after a merge.
- `listMemberships()` returns all memberships by list, in position order.

---

## Queries
[query.js](../../src/js/core/query.js) filters and sorts task arrays in memory (`TEC-16`).
- `filterTasks(tasks, filter, ctx)` keeps the input order; filters combine with AND (`TV-8`).
  - `lists`: list ids, or `NO_LIST` for tasks in no list (`TV-2`).
  - `statuses`: `ready`, `in-progress`, `completed`, `failed`, or `cancelled` (`TV-3`).
  - `due`: `overdue`, `today`, `this-week`, `none`, or `{from, to}` ranges (`TV-4`).
  - `created`: one `{from, to}` range (`TV-5`).
  - `text`: text in the description or any note, ignoring case and surrounding spaces (`TV-6`).
  - `shared`: true for tasks in a shared list, false for the others (`TV-7`).
- A filter with several values matches any of them; an empty or missing value applies no filter.
- `overdue` uses `isOverdue` from overdue.js, so the filter and the flag agree (`OVD-1`).
- Today and this week use local midnights; weeks start on Monday unless `ctx.weekStart` says otherwise.
- Ranges are inclusive; a date-only bound covers that whole local day.
- `ctx` supplies `now`, `listsByTask`, `notesByTask`, `sharedListIds`, and optionally `weekStart`.
- Callers pass tasks from `listTasks()`, which already leaves out the recycle bin.
- `indexMemberships(listMemberships(), liveListIds)` builds `listsByTask` without lists in the recycle bin.
  - `liveListIds` come from `listLists()`; a task only in deleted lists then counts as in no list.
- `sortTasks(tasks, order)` sorts by `due-time`, `creation-time`, `last-update-time`, `status`, or `description`.
- Status and due time come from the current occurrence; stored views read `todo` as `ready`, and `last-activity-time` as `last-update-time`.
  - Directions are `asc` and `desc`; ties break on the task id in the same direction.
  - Tasks without a due time sort last in both directions (`TV-10`).
  - Statuses sort in lifecycle order: `ready`, `in-progress`, `completed`, `failed`, `cancelled`; descriptions ignore case.
- `DEFAULT_FILTER` keeps open tasks; `DEFAULT_ORDER` is due time ascending.
- `sortByPosition(tasks, positionsOfList(memberships, listId))` restores the manual order (`LV-8`).
- Filtering and sorting 5000 tasks takes under 50 ms in Node, per the unit test.

---

## Bulk Operations
[bulk.js](../../src/js/store/bulk.js) serves backup export and import; see [backup-format.md](backup-format.md).
- `snapshot()` returns `{lists, tasks, memberships, notes, occurrences, events}` with every record, in key order, from one transaction.
- `applyChanges(planner)` reads the same snapshot and passes it, with the store time, to `planner`.
  - The planner runs synchronously and returns `{changes, result}`; `applyChanges` resolves with `result`.
  - `changes.put` holds records to store per store name; `changes.delete` holds `memberships`, `notes`, `events`, and `occurrences` keys.
  - Storing a task stores its current occurrence; removing a task removes its occurrences and events.
  - `changes.put.occurrences` stores other occurrences, such as those a format 2 backup import rebuilds.
  - Reading, planning, and writing share one transaction, so nothing changes in between and a failure stores nothing.
  - The writes skip the store's validation; the backup module validates every record first.

---

## Connections
- `openStore({onVersionChange})` keeps one connection open for the page.
- A newer version opened in another tab closes this connection, then calls `onVersionChange`.
- The app answers with the reload banner, since the closed connection serves no more operations.
- An older connection that stays open blocks an upgrade; the open then fails with a `blocked` StoreError.
  Its message reads "Close other tabs of ToDo's to finish the update.", and the app shows it as an error banner.
- The upgrade finishes once that connection closes; the late connection is closed at once.

---

## Change Notifications
- `subscribe(listener)` calls `listener({operation, remote})` after each committed write, and returns an unsubscribe function.
- `operation` names the facade method, such as `createList`; reads never notify.
- A subscriber that throws is logged; the write stays committed and the other subscribers still hear of it.
- `openStore({broadcast: true})` also posts each write on the `{{name}}-changes` BroadcastChannel.
- Stores of other tabs on that channel then notify their subscribers with `remote: true`.
- Broadcasting is opt-in, so unit tests and scripts open no channel.

---

## Sync Queue
[queue.js](../../src/js/sync/queue.js) records changes, [push.js](../../src/js/sync/push.js) uploads them,
[adopt.js](../../src/js/sync/adopt.js) uploads the local data on first connect, and [api.js](../../src/js/sync/api.js) sends the requests.
- `openStore({tracking})` queues every committed write while `tracking()` is true, that is, while an account is connected or expired (`SYN-1`, `SYN-2`).
  - Local mode queues nothing.
  - The entry joins the queue right after the write commits, in a second transaction.
  - `purgeExpired` and `applyChanges` queue nothing. A backup import queues in its own task.
  - `deleteAllData()` replaces the whole queue with one `erase` entry whose `fields.time` is the erase time (`BAK-15`).
    The erase covers every earlier entry, so none uploads; entries queued after it upload after it.
  - `purgeForever(type, id)` queues one `purge` entry and `emptyBin()` one `empty-bin` entry with `fields.time`, the emptying time (`BIN-4`, `BIN-7`).
  - `restoreEntries(entries)` queues one `restore-list` or `restore-task` entry per restored entry, and `purgeEntries(entries)` one `purge` entry per purged entry (`BIN-9`).
    Earlier entries of a purged row stay and upload first, so a queued trash reaches the service before its purge.
    A queued `create` may already be uploading or have lost its reply, so no entry is dropped; a purge of a row the service never got answers `404`, which is done.
- An entry holds `seq`, `target`, `operation`, `fields`, `edit-times`, `created`, and `undo`.
  - `fields` holds only what changed (`SYN-5`). `edit-times` holds the client time of each field. Creates carry all fields.
  - Lists and tasks: `create-`, `update-`, `delete-`, and `restore-` plus the type. A task create carries its `lifecycle-rules`.
  - Rules: `update-rules`, sent as `PATCH /api/tasks/{{task-id}}/lifecycle-rules` with the edit time of each field.
  - Events: `post-event`, sent in order as `POST /api/tasks/{{task-id}}/events` with `id`, `type`, `creation-time`, and `occurrence`.
    A `log` also sends `checked`, `time-spent-seconds`, `amount`, and `label` when set; an `undo-log` sends `target-event-id`.
    A `409` on an `undo-log` of a target the service never stored is a rejection like any other.
  - Memberships: `add-`, `move-`, and `remove-membership`.
  - Purges: `purge`, sent as `DELETE /api/recycle-bin/lists/{{list-id}}` or `DELETE /api/recycle-bin/tasks/{{task-id}}`.
    `empty-bin` is sent as `DELETE /api/recycle-bin` and purges every entry the user may restore at the service's receive time.
    It sends no `before`: the service stamps `deletion-time` with its receive time, so a client time, or a skewed clock, could miss entries trashed from the queue.
    The entry keeps `fields.time`, the emptying time, for the record.
  - Erase: `erase`, sent as `DELETE /api/users/{{user-id}}/data?before={{time}}`; the service erases what the account owned before `time`.
    The user ID comes from the `user-id` sync state, or `GET /api/users/me`.
    A 2xx logs one `erased` record with the counts; `401` pauses the queue, and offline or a 5xx keeps the entry.
    Any other 4xx drops the entry, logs an `error` record, and shows the rejection toast; nothing rolls back.
    No pull runs while an `erase` entry is queued, since the pull follows an empty queue; it runs right after the erase and applies the tombstones.
  - Notes: `create-note`, `edit-note`, and `delete-note`.
    A create sends `occurrence` when linked or explicitly global; otherwise the service places the note.
    An edit sends the changed `text` and `occurrence` with their `edit-times`; undo restores both.
- One request per entry, in `seq` order. A retry repeats the request, and every create is idempotent by identifier (`SYN-10`).
- Requests send `Authorization`, `Edit-Time`, and `Client-Version: todos.webapp/{{version}}` without `-pre`.
- Requests never send `If-Match`.
- Replies map to outcomes:

| Reply                     | Outcome                                                                                 |
| :------------------------ | :-------------------------------------------------------------------------------------- |
| 2xx                       | Done; `conflicts` in the reply go to the sync log as `overwritten`.                     |
| 400, 403, 404, 409, 412   | Rejected: undo the change locally, log it as `rejected`, and tell the user (`SYN-9`).   |
| 404 on a delete or remove | Done; the row is already gone. A `404` on a purge is done too.                          |
| 409 on a purge            | Restored elsewhere: read the row with `GET`, store it, and log it as `error`.           |
| Other 4xx on a purge      | The entry is dropped and logged as `error`; nothing is undone, as the row is gone.      |
| 401                       | The session expires and the queue pauses, keeping its entries. The app asks to sign in. |
| 426                       | All syncing stops. The app asks for an update and names the minimum from `Upgrade`.     |
| No network, 5xx, 408, 429 | Retry the same entry after 1, 2, 5, 15, 30, then 60 seconds.                            |

- A `409` on a purge stores the row read back and clears the stored cursor, so the next pull brings its memberships in a snapshot.
  The log message is "Not deleted: it was restored on another device."
  The entry leaves the queue last: a read that fails, or a `401`, keeps it, and the retry repeats the purge and the recovery.
- Undo changes only fields that still hold the value the rejected change gave them.
- Later local edits therefore stay.
- A rejected create removes the row and drops the queued entries that build on it.
- A rejected event, such as a `409 Conflict`, leaves the events store, and the occurrence before it refolds the later queued events.
  Those later entries get the refolded occurrence as their own undo base, so rejecting several in a row restores the original.
  A rejected rule edit refolds the later queued events the same way, under the old rules.
- One tab syncs (`SYN-12`): the holder of the Web Lock `todos-sync` drains the queue.
  It shares its state on the `todos-sync` BroadcastChannel.
  Other tabs show that state and take over when the leader closes.
- The sync state is `idle`, `syncing`, `synced`, `offline`, `error`, `sign-in-needed`, `question`, or `update-required`.
  It also holds the pending count; `question` also holds `erase`, the waiting `pending-erase`.

### First Connect
- Before adoption, a `pending-erase` settles (`BAK-15`):
  - Its `account` matches the connected account: the app sends `DELETE /api/users/{{user-id}}/data?before={{time}}`.
  - Otherwise the state becomes `question` and nothing uploads until the user answers in Settings.
    Erase sets `account` to the connected account, so the erase runs as above; Keep removes `pending-erase`.
  - A 2xx logs an `erased` record and removes `pending-erase`; adoption then runs, so data created after the erase still uploads.
  - Any failure stops the run before adoption and keeps `pending-erase` for the next run.
    Offline, a 5xx, or a `401` stop as an adoption step does. A refusal (another 4xx) logs an `error` record and shows Sync error.
- Once per account and server, before the queue drains, `adopt` uploads the local data (`CON-4`, `CON-5`).
- It first clears the queue, since the upload covers it.
- It reads the account's lists from the snapshot of the change feed, then matches each local list:
  - Same identifier: the same list.
  - Same name, ignoring case, as a live list the account owns: the local list merges into it.
    Locally the list takes the account list's identifier and its memberships follow.
    `list-map` records the old identifier.
  - Name of a trashed list, or a trashed local list with a taken name: rename to `{{name}} (local)`, `(local 2)`, and so on.
- It uploads lists, tasks with their rules, memberships, the user events of each task, and notes, then the recycle bin states.
  Each note carries its `occurrence` link, null for a global note.
  Each is one request; events replay with `import: true`, which the uploading task owner may send.
- Memberships go by list and position, so each list keeps its manual order.
- A create that finds the row (`200`) is followed by an update with the local edit times.
- A row the service refuses is logged and stays on the device.

---

## Change Feed Download
[pull.js](../../src/js/sync/pull.js) downloads the feed, [merge.js](../../src/js/sync/merge.js) plans how it changes the data,
and [engine.js](../../src/js/sync/engine.js) schedules the runs (`SYN-3`, `CON-6`).
- Lists, tasks, memberships, and notes store the feed's `revision`; lists also keep `role` and `sharing`.
- Notes map the wire `owner-id`, `occurrence`, and `last-update-time` to the same local fields.
- Computed fields are not stored: `overdue`, `upcoming`, `role` of tasks, `task-count`, and `lists` of tasks. Screens derive them.
- A run replays the queue, then pulls every page after the stored cursor until `has-more` is false. Without a cursor it fetches a snapshot.
- The leader tab pulls every 30 seconds while the page is visible, and after going online, gaining focus, becoming visible, or replaying the queue.
  A hidden page still replays the queue.
- A page applies its tombstones first, then its entries. Each applies only when its revision is above the stored one, or the row is absent.
- The merge keeps what the user changed and the service has not heard of yet:
  - A field with an entry in the queue keeps its local value; the other fields take the pulled value (`SYN-5`, `SYN-6`).
  - A task takes the service's rules and current occurrence; rule fields with a queued edit keep their local value.
  - Queued events of the pulled occurrence fold onto it in queue order, until the service confirms them.
  - A pulled one-off task past its due time with handling `fail` stays expired, as the local overdue handling expired it.

  - A row whose creation is still queued is never replaced. A pending trash, membership change, or note edit or delete stays.
    A queued note edit keeps its own fields, `text` or `occurrence`, and takes the other from the feed.
  - A replay that loses a field gets `conflicts` in its reply. The app logs `overwritten` and applies the kept value, unless a later queued change sets that field.
  - Conflicts on `existence` of a membership are logged only; the next feed change corrects the row.
  - Notes never conflict with each other, since each is its own record (`SYN-7`).
- A task owned by another user stays while a visible list holds it. Tasks without one go after the last page, since memberships may follow their tasks.
- A list tombstone with `access-lost` removes the list and, through the rule above, the tasks owned by others. Own tasks stay (`SHR-8`).
  The queued changes to the list and to the removed tasks are dropped, the sync log records `lost-access`,
  and the app shows "You no longer have access to {{list}}. {{n}} changes were undone."
- A `410` (or a `400` for the stored cursor) keeps the queue and drops the rows that came from the service, those with a `revision`.
  Never-uploaded rows stay. A row with queued changes loses only its revision, so the new snapshot merges into it.
  The pull then fetches a snapshot without a message.
- A feed `protocol` other than `1` stops syncing, and the state becomes `update-required` (`SYN-11`).
- Sync states: `local-only`, `synced`, `syncing`, `offline`, `sign-in-needed`, `question`, `error`, and `update-required`.
- Disconnecting (`CON-8`, `CON-9`) keeps own lists and tasks, and removes the rest with its memberships and notes.
  Kept rows lose `revision`, `role`, and `sharing`, and tasks and notes lose their service `owner-id`.
  The queue, the cursor, and the adoption state go; `last-account` and a queued erase stay, see `sync-state`. No route is called.
  A kept task whose local events fold to another status than its occurrence gets events that reproduce it, so the next adoption keeps it.

- A local write between the pull's read of the queue and the entry joining it can lose to the pulled value; the next replay restores it.
