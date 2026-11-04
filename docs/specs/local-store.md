# Local Store
The IndexedDB schema that holds the app's data in the browser.
[db.js](../../src/js/store/db.js) opens it and exposes the store operations; [idb.js](../../src/js/store/idb.js) holds the shared helpers.

---

## Database
- Name: `todos`; one database per browser profile (`LOC-5`).
- Version: 3; `upgrade()` in db.js creates or migrates the stores, one version step at a time.
- Version 1 created `lists`, `tasks`, and `memberships`; version 2 adds `notes` and keeps existing data.
- Version 3 gives existing memberships a `position`, per list in added-time order, then by task id.
- Records use the field names of the service's `List`, `Task`, and `Note` schemas, in kebab-case.
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
- `id`, `description`, `status`, `due-time`, `overdue-handling`, `owner-id`.
- `creation-time`, `last-update-time`, `last-activity-time`, `deletion-time`.
- `last-update-time` changes with task fields; `last-activity-time` also changes with memberships (`TSK-12`).

### `memberships`
Keyed out of line by `[list-id, task-id]`, since IndexedDB key paths cannot hold dashed names.
- `list-id`, `task-id`, `position`, `added-time`; `position` was added in version 3.
- The key order lets one key range read all memberships of a list.
- `position` is a fractional-index key; a list shows its tasks in ascending position order (`LV-2`).

### `notes`
Keyed out of line by `[task-id, id]`, for the same reason; added in version 2.
- `id`, `task-id`, `text`, `author`, `creation-time`, `edit-time`.
- `author` is null for local notes; `edit-time` is null until the first edit.
- The key order lets one key range read all notes of a task.
- Editing or deleting by note id scans the keys only, matching the second key part.

---

## Rules
- List names are unique per owner, ignoring case and surrounding spaces, including lists in the recycle bin (`LST-3`).
- List names hold 1 to 100 characters, descriptions at most 1000 (`LST-1`, `LST-2`).
- Task descriptions hold 1 to 500 characters after trimming surrounding spaces (`TSK-1`).
- A date-only due time, such as `2026-11-08`, is stored as 23:59 local time on that date (`TSK-6`).
- New tasks default to status `todo` and overdue handling `keep` (`TSK-2`).
- Note texts hold 1 to 2000 characters after trimming surrounding spaces (`NOT-1`).
- A task lists its notes newest first, by creation time, then by identifier (`NOT-3`).
- Adding, editing, or deleting a note sets the task's `last-activity-time`, not its `last-update-time` (`NOT-5`).
- An unknown task or note throws a `StoreError` with code `not-found`.
- Invalid input throws a `ValidationError` naming the field and the rule, and stores nothing.
- Every write runs in one transaction, so a failure leaves no partial change.

---

## Recycle Bin
[bin.js](../../src/js/store/bin.js) uses the existing `deletion-time` fields and needs no schema change.
- Deleting a list or task sets its `deletion-time` and `last-update-time`; a task also sets `last-activity-time`.
- Memberships stay stored, so restoring a list or task brings them all back (`BIN-3`).
- A deleted list is hidden from `listLists` and `listsOfTask`, and `tasksOfList` returns no tasks for it.
- A deleted list's tasks stay in their other lists, or in no list, and keep their activity time (`LST-6`, `LST-7`).
- A deleted task is hidden from `listTasks` and `tasksOfList`; `getTask` and `notesOfTask` still read it (`TSK-11`).
- Changes to a deleted list or task throw a `StoreError` with code `deleted` (`BIN-6`).
  - Lists: `updateList`, `addToList`, `removeFromList`, `moveInList`, and `createTask` into that list.
  - Tasks: `updateTask`, `addToList`, `removeFromList`, `moveInList`, and every note change.
- `listBin` returns entries with `type`, `id`, `name` or `description`, `deletion-time`, and `purge-time`, newest first.
- `purge-time` is 30 days after `deletion-time`; restoring later throws code `expired` (`BIN-2`).
- `purgeForever(type, id)` removes a bin entry and its memberships, and a task's notes (`BIN-4`).
- Restoring keeps each membership's `position`, so the task returns to its place in every list.
- `purgeExpired(now)` removes every entry deleted more than 30 days ago in one transaction (`BIN-5`).
- Restoring or purging an entry outside the bin throws code `not-deleted`.

---

## Overdue Handling
[overdue.js](../../src/js/core/overdue.js) computes the flag and cancels overdue tasks through the store facade.
- `isOverdue(task, now)` is true when `due-time` is before `now` and the status is `todo` or `in-progress` (`OVD-1`).
- `applyOverdueHandling(store, now)` sets overdue `cancel` tasks to `cancelled` via `updateTask` (`OVD-4`).
- It never changes deleted, `completed`, or `cancelled` tasks (`OVD-6`).
- `startOverdueTimer` runs it once on start, then every minute; the returned function stops it (`OVD-5`).

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
  - The move sets the task's `last-activity-time`, not its `last-update-time`.
- A rebalance gives the whole list keys `a0`, `a1`, and so on, keeping its order.
  - It runs before a new key would exceed 128 characters, the service limit.
  - It also runs when the neighbors share a position, such as after a merge.
- `listMemberships()` returns all memberships by list, in position order.

---

## Queries
[query.js](../../src/js/core/query.js) filters and sorts task arrays in memory (`TEC-16`).
- `filterTasks(tasks, filter, ctx)` keeps the input order; filters combine with AND (`TV-8`).
  - `lists`: list ids, or `NO_LIST` for tasks in no list (`TV-2`).
  - `statuses`: statuses (`TV-3`).
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
- `sortTasks(tasks, order)` sorts by `due-time`, `creation-time`, `last-activity-time`, `status`, or `description`.
  - Directions are `asc` and `desc`; ties break on the task id in the same direction.
  - Tasks without a due time sort last in both directions (`TV-10`).
  - Statuses sort in lifecycle order; descriptions ignore case.
- `DEFAULT_FILTER` keeps open tasks; `DEFAULT_ORDER` is due time ascending.
- `sortByPosition(tasks, positionsOfList(memberships, listId))` restores the manual order (`LV-8`).
- Filtering and sorting 5000 tasks takes under 50 ms in Node, per the unit test.

---

## Bulk Operations
[bulk.js](../../src/js/store/bulk.js) serves backup export and import; see [backup-format.md](backup-format.md).
- `snapshot()` returns `{lists, tasks, memberships, notes}` with every record, in key order, from one transaction.
- `applyChanges(planner)` reads the same snapshot and passes it, with the store time, to `planner`.
  - The planner runs synchronously and returns `{changes, result}`; `applyChanges` resolves with `result`.
  - `changes.put` holds records to store per store name; `changes.delete` holds `memberships` and `notes` keys.
  - Reading, planning, and writing share one transaction, so nothing changes in between and a failure stores nothing.
  - The writes skip the store's validation; the backup module validates every record first.
