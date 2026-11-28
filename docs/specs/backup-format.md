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
  "format-version": 3,
  "app-version": "0.6.1-pre",
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

- Export writes format 3; import reads formats 1, 2, and 3.
- Formats 2 and 3 follow the todos.server JSON format: tasks embed nothing, and their parts are top-level arrays.
- Format 3 adds goals, start times, the log, and the `failed` status of ADR-0006 of todos.server.
- [backup-v1.json](../../tests/fixtures/backup-v1.json), [backup-v2.json](../../tests/fixtures/backup-v2.json),
  and [backup-v3.json](../../tests/fixtures/backup-v3.json) are sample files.
  The format 3 sample is the format 2 sample after import and export.

---

## Header Fields
- `format`: always `todos-backup`.
- `format-version`: the integer 3 for this layout, or 1 or 2 for the former ones; readers reject other versions (`BAK-3`).
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
- `task-id`, then the rule fields of the store: `start-time`, `due-time`, `overdue-handling`.
- The goal: `goal-direction`, `goal-measure`, `goal-target`, and `goal-unit`.
- `recurrence-unit`, `recurrence-interval`, `recurrence-end-date`, `recurrence-end-count`, `timezone`.
- `target-count` is gone; formats 1 and 2 are converted (see Format 2).
- One record per task; a task without one gets the default rules on import: `at-least`, `checks`, target 1.

### `occurrences`
- `task-id`, `occurrence`, `start-time`, `due-time`, `status`, `close-time`.
- The goal snapshot `goal-direction`, `goal-measure`, and `goal-target`, and the cache `progress` and `time-spent-seconds`.
- Every stored occurrence of each task, the current one included.
- Export-only: import rebuilds the occurrences from the rules and events, and stores none of these.
- Optional on import: a file without the array reads as one with an empty array.

### `events`
- `id`, `task-id`, `occurrence`, `creation-time`, `owner-id`, `type`, `details`.
- Log fields: `checked`, `time-spent-seconds`, `amount`, `label`, and `target-event-id`.
- Every stored event of each task, system events and rule edits included.
- `details` of an `edit-lifecycle-rules` event holds the old and new value of each changed rule field.
- Types include `log` and `undo-log`; `complete` and `uncomplete` never appear in format 3.

### `memberships`
- `list-id`, `task-id`, `position`, `added-time`.
- `position` is the fractional-index key of the task in that list, as in the store.

### `notes`
- `id`, `task-id`, `text`, `owner-id`, `occurrence`, `creation-time`, `last-update-time`, as in the store.
- `occurrence` is null for a global note, or the number of the occurrence it belongs to.

### Format 2
Format 2 has the layout of format 3 with the former goal, log, and status model; import converts it before validation of the converted values.
Files that the app wrote before format 3 also hold `log` and `undo-log` events beside `complete` and `uncomplete`; the conversion keeps them, so no entry is lost.
Import validates the log fields, and rebuilds each occurrence cache and its live entries with the log fold.
The app converts a format 2 file in memory; it validates the file as format 2 first, then validates the converted values as format 3.
- Rules: `target-count` N becomes an `at-least` goal of N `checks`; `start-time` and `goal-unit` are null.
  `overdue-handling` `cancel` becomes `fail`.
- Occurrences are never read, since import rebuilds them.
- Events: each `complete` becomes a checked `log` with the same `id`, time, and owner.
  - Each applied `uncomplete` becomes an `undo-log` of the latest check live at its place, as in the store upgrade.
  - An `uncomplete` the old fold ignores, or one without a live check, is skipped and listed in `skippedEvents` of the import result.
  - An `edit-lifecycle-rules` event converts its `target-count` change into `goal-target`, and `cancel` into `fail`.
- Statuses of the rebuilt occurrences follow Rebuilding Occurrences; a closing event that left `ready` or `in-progress` gives `failed`.
- The conversion is the one of the todos.server import, so a file converts alike in both apps.

### Format 1
Format 1 keeps the former task and note shape; import maps it onto the store.
- Tasks: `id`, `description`, `status`, `due-time`, `overdue-handling`, `owner-id`.
  Also `creation-time`, `last-update-time`, `last-activity-time`, and `deletion-time`.
- Notes: `id`, `task-id`, `text`, `author`, `creation-time`, `edit-time`.
- Import folds both task times into `last-update-time`, taking the later one.
- Import maps a status onto events: an added task gets a `create` event and at most one status event.
  A `completed` status gives a checked `log`; tasks get the default goal, and the result converts as format 2 does.
- A replaced task keeps its events and occurrences, and gets the events from its old to its new status at the import time.
  Reopening a completed task adds an `undo-log` of its latest live check.
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
- `format-version` must be 1, 2, or 3; other values fail with code `unsupported-version`.
- `app-version` must be a non-empty string, and `export-time` a valid time.
- `lists`, `tasks`, `memberships`, and `notes` must be arrays of objects.
  Formats 2 and 3 also need `lifecycle-rules` and `events` arrays, and read `occurrences` when present.
- Every field follows the store rules:
  - List names hold 1 to 100 characters and are unique per owner, ignoring case.
  - List descriptions hold at most 1000 characters and are kept exactly, like the store keeps them.
  - Task descriptions hold 1 to 500 characters; `status` and `overdue-handling` use the store values.
  - Rules follow the store: an interval from 1 to 99 and an IANA `timezone`; `recurrence-unit` is `day`, `week`, `month`, or `year`.
    A recurring rule needs its interval and timezone, and keeps `due-time` and `overdue-handling` null.
    A one-off rule keeps `recurrence-interval`, `recurrence-end-date`, `recurrence-end-count`, and `timezone` null.
    Either break fails with the path of the field, such as `lifecycle-rules[0].timezone`.
  - Goals follow the store:
    - `goal-direction` is `at-least` or `at-most`; `goal-measure` is `checks`, `time`, `amount`, or `reading`.
    - `goal-target` is a whole number from 1 to 999,999,999,999 for `checks` and `time`, else a decimal from 0 to 999,999,999,999.999 with at most 3 decimals.
    - `goal-unit` holds at most 20 characters, and only for `amount` and `reading`.
    - An `at-most` goal needs a `due-time` or a recurrence.
    - `overdue-handling` is `keep` or `fail`.
  - `start-time` may be null; otherwise it lies before `due-time` and before `recurrence-end-date`.
  - Occurrence numbers start at 1 and are unique per task; statuses are `ready`, `in-progress`, `completed`, `failed`, `cancelled`.
    `progress` is null or a number from 0 with at most 3 decimals, and `time-spent-seconds` a whole number from 0.
  - Event types are those of the service's `TaskEvent`; an `edit-lifecycle-rules` event lists only rule fields.
    Its `old` and `new` values follow the same rule checks, so `events[2].details.timezone.new` names a bad zone.
  - A `log` holds at least one of `checked`, `time-spent-seconds`, and `amount`.
    `time-spent-seconds` is a whole number from 1 to 2,147,483,647, `amount` follows the goal range, and `label` holds at most 100 characters.
  - An `undo-log` needs a `target-event-id`; other types have none.
    A target missing from the file and the store does not fail the file: import skips that event and lists it in `skippedEvents`.
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
- Lists, tasks, and format 2 and 3 notes compare `last-update-time`.
- Format 1 notes compare `edit-time`, or `creation-time` when not edited.
- A format 1 task's backup time is the later of its `last-update-time` and `last-activity-time`.
- A strictly later backup version replaces the local record; otherwise the local record stays.
- Formats 2 and 3: a task that the backup adds or replaces keeps its local events and gains the backup events by `id`.
  Events are never removed; a task whose local version wins keeps its events as they are.
- A missing membership goes after the last task of its list, in backup order (`BAK-7`).
- A list without local memberships takes the backup positions as they are.
- Existing memberships keep their positions; merge never removes anything.
- Imported records keep their backup times; only binning sets new ones.

### Overwrite
Replaces all data the user owns with the backup contents (`BAK-8`).
- Every backup list, task, and note replaces the local record with the same `id`, or is added.
  A format 2 or 3 task counts as changed when its fields or rules differ, or rebuilding it changes its events or occurrences.
- Memberships between a backup list and a backup task take exactly the backup set and positions.
- Notes of backup tasks take exactly the backup set.
- Formats 2 and 3: a replaced task takes exactly the backup events; events missing from the backup are removed.
- Owned lists and tasks missing from the backup move to the recycle bin (`BAK-9`).
  - Binning works like deleting: it sets `deletion-time` and `last-update-time`.

  - Their memberships and notes stay, so restoring brings them back.
- Records already in the recycle bin and missing from the backup stay unchanged.
- Importing an export into an empty store reproduces the same data (`BAK-14`).
  With format 3 this includes every rule, occurrence, and event.

### Rebuilding Occurrences
Format 2 and 3 import rebuilds each written task's occurrences from its rules and events, as the todos.server JSON format replays them.
A format 2 file converts first, so the replay always runs on goals and the log.
- The task starts with its first rules: the exported rules with every `edit-lifecycle-rules` event undone, newest first.
- Its events then apply in time order, through the store's fold (`LOC-2`):
  - A recurring task first rolls over up to each event's time.
  - A rule edit applies its new values at its time, as `updateRules` does.
  - A `roll-over` or `end-recurrence` event closes the occurrence it names, when that is the open current one.
    Missing ones are written anew; repeated ones are left out.
  - A user event that names an earlier, closed occurrence joins it, and that occurrence folds again.
  - An `undo-log` is placed right after its target, not by its own time, and joins the target's occurrence.
    It rolls over only up to its own time, which the target's replay already passed, so snapshots and assignment stay unchanged.
  - An `undo-log` whose target is missing from the file is skipped and reported, as other skipped events are.
  - The fold, readings carried between occurrences, and verdicts are those of the local store (see [local-store.md](local-store.md)).
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
  When they do, import adds `log` events that reach the progress, time spent, and status of the highest exported occurrence.
  - A `checks` goal gets one checked `log` per missing check, up to 10,000 per occurrence; format 2 completions follow the same limit.
    **[Decided]** The user chose this limit, which the server's CSV import also uses. A larger gap gets none, since a log holds one check.
    The progress then stays as the fold computes it, the import result lists the task in `unrebuiltProgress` with the `missing` checks,
    and the import dialog names it, in the preview and after the import.
  - A `time` goal gets one `log` with the missing seconds; an `amount` goal one with the missing amount.
  - A `reading` goal gets one `log` with the exported progress as its amount.
  - A recurring task first rolls over to that occurrence. The events take the import time.
  - A recurring occurrence takes the last moment of its period instead, when that comes earlier.
  - An exported `progress` that logs cannot reach, such as one below the replayed sum, is left as the fold computes it.
- **[Decided]** A closed exported recurring occurrence first gets its progress, then closes like the server closes it.
  When the end rules end the series at its period end, an `end-recurrence` event closes it with the verdict of the goal, `completed` or `failed`.
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
- Formats 2 and 3 replay a missing task with `import: true`, as the todos.server JSON format says:
  - The create carries the first rules, with their goal fields, and the `create` event's identifier as `event-id`.
  - Rule edits follow as `update-rules` with `event-id`, their new values, and their time as edit time.
  - User events follow as `post-event` with their `id`, time, and occurrence, all in time order.
    A `log` carries `checked`, `time-spent-seconds`, `amount`, and `label`; an `undo-log` carries `target-event-id`.
  - An `undo-log` posts right after its target, as in Rebuilding Occurrences.
- Format 2 and 3 notes replay with their `occurrence`, and `null` keeps a global note global.
  Without it the service would link a recurring task's note to the period of its creation time.
  Format 1 notes replay without `occurrence`.
- A replaced format 2 or 3 task posts only its new user events, with `import: true`; system events never queue.
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
- `skippedEvents`: the identifiers of events that conversion or import left out, present only when there are some.
- `unrebuiltProgress`: the tasks whose missing checks exceeded 10,000, each as `{task-id, missing}`, present only when there are some.
- `importBackup` applies the same plan and returns its counts; cancelling the preview writes nothing (`BAK-12`).
- The preview reads its own snapshot, and the import plans again from a fresh one.
  The counts can differ when data changes between the preview and the import.
