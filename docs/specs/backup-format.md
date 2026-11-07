# Backup Format
The JSON file that holds a full backup of the app's data, and how importing it merges or overwrites.
[backup.js](../../src/js/core/backup.js) exports, validates, previews, and imports it.

---

## File
- One JSON object in UTF-8, written with two-space indentation (`BAK-1`).
- The file name is `todos-backup-{{yyyy-mm-dd}}.json`, with the local export date (`BAK-4`).
- Records use the field names of the [local store](local-store.md), in kebab-case.
- Times are ISO-8601 strings in UTC, such as `2026-11-04T09:00:00.000Z`; milliseconds are optional.
- Recycle bin entries are the lists and tasks whose `deletion-time` is set (`BAK-2`).

```json
{
  "format": "todos-backup",
  "format-version": 1,
  "app-version": "0.1.0-pre",
  "export-time": "2026-11-04T09:00:00.000Z",
  "lists": [],
  "tasks": [],
  "memberships": [],
  "notes": []
}
```

---

## Header Fields
- `format`: always `todos-backup`.
- `format-version`: the integer 1 for this layout; readers reject other versions (`BAK-3`).
- `app-version`: the version of the app that wrote the file, from package.json.
- `export-time`: the time of the export.

---

## Records

### `lists`
- `id`, `name`, `description`, `owner`.
- `creation-time`, `last-update-time`, `deletion-time`.
- `owner` is null for local lists, or the service's owner object with a numeric `id`.

### `tasks`
- `id`, `description`, `status`, `due-time`, `overdue-handling`, `owner-id`.
- `creation-time`, `last-update-time`, `last-activity-time`, `deletion-time`.

### `memberships`
- `list-id`, `task-id`, `position`, `added-time`.
- `position` is the fractional-index key of the task in that list, as in the store.

### `notes`
- `id`, `task-id`, `text`, `author`, `creation-time`, `edit-time`.
- `author` is null for local notes; `edit-time` is null until the first edit.

### Order
- Lists and tasks are sorted by `id`.
- Memberships are sorted by `list-id`, then by `position`.
- Notes are sorted by `task-id`, then by `creation-time`.

---

## Validation
An import first validates the whole file; any failure changes nothing and names the reason (`BAK-13`).
- The text must be valid JSON holding one object with `format` set to `todos-backup`.
- `format-version` must be 1; other values fail with code `unsupported-version`.
- `app-version` must be a non-empty string, and `export-time` a valid time.
- `lists`, `tasks`, `memberships`, and `notes` must be arrays of objects.
- Every field follows the store rules:
  - List names hold 1 to 100 characters and are unique per owner, ignoring case.
  - List descriptions hold at most 1000 characters and are kept exactly, like the store keeps them.
  - Task descriptions hold 1 to 500 characters; `status` and `overdue-handling` use the store values.
  - Note texts hold 1 to 2000 characters.
  - Positions are well-formed fractional-index keys of at most 128 characters.
    They follow `validateKey` in fractional-index.js and the service's `FractionalIndex`, so `0zz`, `a00`, and `a` fail.
  - Times are real calendar times, so `2026-02-30T00:00:00Z` fails; `due-time`, `deletion-time`, and `edit-time` may be null.
  - Names, task descriptions, and note texts are trimmed like the store trims them.
- Identifiers are non-empty strings, unique per record type; memberships are unique per list and task.
- Memberships and notes refer only to lists and tasks in the same file.
- Unknown fields are ignored and not stored.
- Errors carry a `code` (`invalid-json`, `invalid`, or `unsupported-version`) and the `path` of the bad value.

---

## Import Modes
Both modes run in one store transaction, so a failure leaves no partial change (`BAK-5`).

### Merge
Matches lists, tasks, and notes by `id`; the most recently updated version wins (`BAK-6`).
- A record missing locally is added.
- Lists and tasks compare `last-update-time`; notes compare `edit-time`, or `creation-time` when not edited.
- A strictly later backup version replaces the local record; otherwise the local record stays.
- A replaced task keeps the later `last-activity-time` of both versions.
- A missing membership goes after the last task of its list, in backup order (`BAK-7`).
- A list without local memberships takes the backup positions as they are.
- Existing memberships keep their positions; merge never removes anything.
- Imported records keep their backup times; only binning sets new ones.

### Overwrite
Replaces all data the user owns with the backup contents (`BAK-8`).
- Every backup list, task, and note replaces the local record with the same `id`, or is added.
- Memberships between a backup list and a backup task take exactly the backup set and positions.
- Notes of backup tasks take exactly the backup set.
- Owned lists and tasks missing from the backup move to the recycle bin (`BAK-9`).
  - Binning works like deleting: it sets `deletion-time` and `last-update-time`, and a task's `last-activity-time`.
  - Their memberships and notes stay, so restoring brings them back.
- Records already in the recycle bin and missing from the backup stay unchanged.
- Importing an export into an empty store reproduces the same data (`BAK-14`).

### Ownership
- The import takes an optional `ownerId` option, the connected user's identifier; it is null in local mode.
- Identifiers compare as strings, so `7` and `"7"` match.
- In local mode, all data counts as owned.
- When connected, lists owned by other users, and tasks in them, are never changed (`BAK-10`).
  - Their backup versions count as skipped; overwrite never bins them.
  - Owned means an `owner` or `owner-id` that is null or the user's; overwrite bins only owned records.

### Import While Connected
- The import takes a `connected` option; the dialog sets it whenever the session is not local.
- Overwrite mode throws a `BackupError` with path `mode`, since an import never removes data from the account.
- The writes and the queue entries commit in one transaction; the preview counts the same changes.
- A newer row (later `last-update-time`) queues all its mergeable fields with no edit time, so the service takes its receive time.
  An older row queues nothing.
- A row missing locally queues a create; a bin move queues a delete or restore, restores first and deletes last.
- Existing notes stay as they are and never queue; only missing notes queue a create.
- Memberships only add: new ones queue an add in list order, and existing ones keep their positions.
- The `ownerId` option is the `user-id` of the sync state, so lists of other owners and their tasks stay unchanged.

### Name Clashes
- List names stay unique per owner, including lists in the recycle bin (`LST-3`).
- In overwrite mode, a local list that the same import bins yields its name to an imported list.
  The binned list gets the suffix instead, such as `Home (2)`, and keeps it when restored.
- Otherwise, an imported list whose name another list already uses gets a suffix, such as `Home (2)`.
  This includes lists that were in the recycle bin before the import.

---

## Preview
`previewImport` plans the import without writing and returns its counts (`BAK-11`).
- `added`: records new to the store.
- `updated`: records the backup version replaces.
- `binned`: lists and tasks the import moves to the recycle bin.
- `removed`: memberships and notes that overwrite deletes.
- `skipped`: backup records that change nothing, being identical, older, or not owned.
- Each count covers lists, tasks, memberships, and notes; the `lists`, `tasks`, `memberships`, and `notes` fields break them down.
- `importBackup` applies the same plan and returns its counts; cancelling the preview writes nothing (`BAK-12`).
- The preview reads its own snapshot, and the import plans again from a fresh one.
  The counts can differ when data changes between the preview and the import.
