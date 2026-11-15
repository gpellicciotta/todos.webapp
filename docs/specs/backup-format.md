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
  "format-version": 2,
  "app-version": "0.5.0-pre",
  "export-time": "2026-11-04T09:00:00.000Z",
  "lists": [],
  "tasks": [],
  "lifecycle-rules": [],
  "occurrences": [],
  "events": [],
  "memberships": [],
  "notes": []
}
```

- Export writes format 2; import reads formats 1 and 2.
- Format 2 follows the todos.server JSON format: tasks embed nothing, and their parts are top-level arrays.
- [backup-v1.json](../../tests/fixtures/backup-v1.json) and [backup-v2.json](../../tests/fixtures/backup-v2.json) are sample files.

---

## Header Fields
- `format`: always `todos-backup`.
- `format-version`: the integer 2 for this layout, or 1 for the former one; readers reject other versions (`BAK-3`).
- `app-version`: the version of the app that wrote the file, from package.json.
- `export-time`: the time of the export.

---

## Records

### `lists`
- `id`, `name`, `description`, `owner`.
- `creation-time`, `last-update-time`, `deletion-time`.
- `owner` is null for local lists, or the service's owner object with a numeric `id`.

### `tasks`
- `id`, `description`, `owner-id`, `creation-time`, `last-update-time`, `deletion-time`.
- A task embeds neither `lifecycle-rules` nor `current-occurrence`; the arrays below refer to it by `task-id`.

### `lifecycle-rules`
- `task-id`, then the rule fields of the store: `target-count`, `due-time`, `overdue-handling`.
- `recurrence-unit`, `recurrence-interval`, `recurrence-end-date`, `recurrence-end-count`, `timezone`.
- One record per task; a task without one gets the default rules on import.

### `occurrences`
- `task-id`, `occurrence`, `start-time`, `due-time`, `target-count`, `completion-count`, `status`, `close-time`.
- Every stored occurrence of each task, the current one included.
- Export-only: import rebuilds the occurrences from the rules and events, and stores none of these.

### `events`
- `id`, `task-id`, `occurrence`, `creation-time`, `owner-id`, `type`, `details`.
- Every stored event of each task, system events and rule edits included.
- `details` of an `edit-lifecycle-rules` event holds the old and new value of each changed rule field.

### `memberships`
- `list-id`, `task-id`, `position`, `added-time`.
- `position` is the fractional-index key of the task in that list, as in the store.

### `notes`
- `id`, `task-id`, `text`, `owner-id`, `occurrence`, `creation-time`, `last-update-time`, as in the store.
- `occurrence` is null for a global note, or the number of the occurrence it belongs to.

### Format 1
Format 1 keeps the former task and note shape; import maps it onto the store.
- Tasks: `id`, `description`, `status`, `due-time`, `overdue-handling`, `owner-id`.
  Also `creation-time`, `last-update-time`, `last-activity-time`, and `deletion-time`.
- Notes: `id`, `task-id`, `text`, `author`, `creation-time`, `edit-time`.
- Import folds both task times into `last-update-time`, taking the later one.
- Import maps a status onto events: an added task gets a `create` event and at most one status event.
- A replaced task keeps its events and occurrences, and gets the events from its old to its new status at the import time.
  Its deadline fields edit its rules; a recurring task keeps its rules, since format 1 knows no recurrence.
- A note's `author` maps to `owner-id`, and its `edit-time` to `last-update-time`; a replaced note keeps its occurrence.

### Order
- Lists and tasks are sorted by `id`; rules follow the task order.
- Occurrences are sorted by `task-id`, then by `occurrence`.
- Events are sorted by `task-id`, then by `creation-time`, then by `id`.
- Memberships are sorted by `list-id`, then by `position`.
- Notes are sorted by `task-id`, then by `creation-time`.

---

## Validation
An import first validates the whole file; any failure changes nothing and names the reason (`BAK-13`).
- The text must be valid JSON holding one object with `format` set to `todos-backup`.
- `format-version` must be 1 or 2; other values fail with code `unsupported-version`.
- `app-version` must be a non-empty string, and `export-time` a valid time.
- `lists`, `tasks`, `memberships`, and `notes` must be arrays of objects.
  Format 2 also needs `lifecycle-rules`, `occurrences`, and `events` arrays.
- Every field follows the store rules:
  - List names hold 1 to 100 characters and are unique per owner, ignoring case.
  - List descriptions hold at most 1000 characters and are kept exactly, like the store keeps them.
  - Task descriptions hold 1 to 500 characters; `status` and `overdue-handling` use the store values.
  - Rules follow the store: a target of at least 1, an interval from 1 to 99, and an IANA `timezone`.
    A recurring rule needs its interval and timezone, and keeps `due-time` and `overdue-handling` null.
    A one-off rule keeps `recurrence-interval`, `recurrence-end-date`, `recurrence-end-count`, and `timezone` null.
    Either break fails with the path of the field, such as `lifecycle-rules[0].timezone`.
  - Occurrence numbers start at 1 and are unique per task; statuses are `ready`, `in-progress`, `completed`, `cancelled`.
  - Event types are those of the service's `TaskEvent`; an `edit-lifecycle-rules` event lists only rule fields.
    Its `old` and `new` values follow the same rule checks, so `events[2].details.timezone.new` names a bad zone.
  - Note texts hold 1 to 2000 characters; a note `occurrence` is null or at least 1.
  - Positions are well-formed fractional-index keys of at most 128 characters.
    They follow `validateKey` in fractional-index.js and the service's `FractionalIndex`, so `0zz`, `a00`, and `a` fail.
  - Times are real calendar times, so `2026-02-30T00:00:00Z` fails; `due-time`, `deletion-time`, and `edit-time` may be null.
  - Names, task descriptions, and note texts are trimmed like the store trims them.
- Identifiers are non-empty strings, unique per record type; memberships are unique per list and task.
- Memberships, notes, rules, occurrences, and events refer only to lists and tasks in the same file.
- Unknown fields are ignored and not stored.
- Errors carry a `code` (`invalid-json`, `invalid`, or `unsupported-version`) and the `path` of the bad value.

---

## Import Modes
Both modes run in one store transaction, so a failure leaves no partial change (`BAK-5`).

### Merge
Matches lists, tasks, and notes by `id`; the most recently updated version wins (`BAK-6`).
- A record missing locally is added.
- Lists, tasks, and format 2 notes compare `last-update-time`.
- Format 1 notes compare `edit-time`, or `creation-time` when not edited.
- A format 1 task's backup time is the later of its `last-update-time` and `last-activity-time`.
- A strictly later backup version replaces the local record; otherwise the local record stays.
- Format 2: a task that the backup adds or replaces keeps its local events and gains the backup events by `id`.
  Events are never removed; a task whose local version wins keeps its events as they are.
- A missing membership goes after the last task of its list, in backup order (`BAK-7`).
- A list without local memberships takes the backup positions as they are.
- Existing memberships keep their positions; merge never removes anything.
- Imported records keep their backup times; only binning sets new ones.

### Overwrite
Replaces all data the user owns with the backup contents (`BAK-8`).
- Every backup list, task, and note replaces the local record with the same `id`, or is added.
  A format 2 task counts as changed when its fields or rules differ, or rebuilding it changes its events or occurrences.
- Memberships between a backup list and a backup task take exactly the backup set and positions.
- Notes of backup tasks take exactly the backup set.
- Format 2: a replaced task takes exactly the backup events; events missing from the backup are removed.
- Owned lists and tasks missing from the backup move to the recycle bin (`BAK-9`).
  - Binning works like deleting: it sets `deletion-time` and `last-update-time`.

  - Their memberships and notes stay, so restoring brings them back.
- Records already in the recycle bin and missing from the backup stay unchanged.
- Importing an export into an empty store reproduces the same data (`BAK-14`).
  With format 2 this includes every rule, occurrence, and event.

### Rebuilding Occurrences
Format 2 import rebuilds each written task's occurrences from its rules and events, as the todos.server JSON format replays them.
- The task starts with its first rules: the exported rules with every `edit-lifecycle-rules` event undone, newest first.
- Its events then apply in time order, through the store's fold (`LOC-2`):
  - A recurring task first rolls over up to each event's time.
  - A rule edit applies its new values at its time, as `updateRules` does.
  - A `roll-over` or `end-recurrence` event closes the occurrence it names, when that is the open current one.
    Missing ones are written anew; repeated ones are left out.
  - A user event that names an earlier, closed occurrence joins it, and that occurrence folds again.
- **[Decided]** The replay always ends with the exported rules, which win over the rule edits.
  Rule edits can miss changes: `updateTask` edits deadlines without one, and pulled tasks bring no remote events.
  Merge can also add older local rule edits to a newer backup task.
  When the replayed rules differ, a new `edit-lifecycle-rules` event sets the exported values.
  It takes the task's `last-update-time`, and at least 1 ms after the last rule edit, since the service merges by edit time.
  A field that no event names keeps its exported value from the first rules on.
- **[Decided]** Partial rule edits never break the one-off or recurring shape, which the service refuses.
  First rules that undo into a broken shape, such as a unit without timezone, give way to the exported rules.
  A rule edit that would break the shape stays in the history without effect, and never replays to the service.
- Events written anew take UUIDv7 identifiers from their time, task, type, and occurrence.
  Importing the same file again therefore writes the same identifiers and changes nothing.
- The import never rolls over up to now; the store or the service does so afterwards.
- **[Decided]** Backup events can miss the exported current status, since a connected device keeps only its own events.
  When they do, import adds the user events that reach the count and status of the highest exported occurrence.
  A recurring task first rolls over to that occurrence. The events take the import time.
  A recurring occurrence takes the last moment of its period instead, when that comes earlier.
- **[Decided]** A closed exported recurring occurrence first gets its count, then closes like the server closes it.
  When the end rules end the series at its period end, an `end-recurrence` event closes it, completed or cancelled.
  Only a series cancelled before its period end gets a user `cancel` event, at its close time.
- **[Decided]** Rules and events count with their task; the counts cover lists, tasks, memberships, and notes.

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
- Format 2 replays a missing task with `import: true`, as the todos.server JSON format says:
  - The create carries the first rules, and the `create` event's identifier as `event-id`.
  - Rule edits follow as `update-rules` with `event-id`, their new values, and their time as edit time.
  - User events follow as `post-event` with their `id`, time, and occurrence, all in time order.
- Format 2 notes replay with their `occurrence`, and `null` keeps a global note global.
  Without it the service would link a recurring task's note to the period of its creation time.
  Format 1 notes replay without `occurrence`.
- A replaced format 2 task posts only its new user events, with `import: true`; system events never queue.
- The service takes `import: true` from the task owner only. A refused replayed event only leaves the events store.
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
  Rules, occurrences, and events have no counts of their own.
- `importBackup` applies the same plan and returns its counts; cancelling the preview writes nothing (`BAK-12`).
- The preview reads its own snapshot, and the import plans again from a fresh one.
  The counts can differ when data changes between the preview and the import.
