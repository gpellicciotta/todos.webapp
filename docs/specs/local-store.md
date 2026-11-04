# Local Store
The IndexedDB schema that holds the app's data in the browser.
[db.js](../../src/js/store/db.js) opens it and exposes the store operations; [idb.js](../../src/js/store/idb.js) holds the shared helpers.

---

## Database
- Name: `todos`; one database per browser profile (`LOC-5`).
- Version: 2; `upgrade()` in db.js creates or migrates the stores, one version step at a time.
- Version 1 created `lists`, `tasks`, and `memberships`; version 2 adds `notes` and keeps existing data.
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
- `list-id`, `task-id`, `added-time`.
- The key order lets one key range read all memberships of a list.

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
