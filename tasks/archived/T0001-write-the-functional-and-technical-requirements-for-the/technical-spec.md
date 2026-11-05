## Technical Specifications

### Founding Requirements
Stated by the user on 2026-11-03:
- The app works 100% offline and independently of the backend.
- The app can connect to the backend and then use it fully.
- The app lives in its own repository; the REST API is the only contract with the todos service.

### Product Requirements
Stated by the user on 2026-11-03:
- The app works fully offline as a personal todo list and task management system.
- Connecting to the todos backend is optional and opt-in.
- Connecting adds data on all devices, since the backend manages the data centrally.
- Connecting adds sharing lists with other users, to share a view or work on one project.
- Connecting gives up anonymity: login is required, and the backend admits invited users only.
- Lists act as tags; a list has a name and a description, and can be shared once connected.
- Tasks have a description and a status: `todo`, `in-progress`, `completed`, or `cancelled`.
- Tasks have an optional due time and an optional overdue behavior: keep, or cancel automatically.
- Users create tasks, change their status, add notes, and add or remove them from one or more lists.
- The list view shows and edits all tasks of a list, ordered by hand or by automatic order buttons.
- The task view shows and edits all tasks, filtered by list, due date, status, and more.
- The task view orders tasks by due date, creation time, last activity time, and more.
- Users export a full backup of all tasks as a single file.
- Users re-import a full backup, merged with or overwriting the stored data.

### Gaps Against the Service
Found while reading the sources on 2026-11-03:
- Task notes: the service `Task` schema and `tasks` table have no notes field.
- Last activity ordering: the service orders by `creation-time` or `due-time` only, and has `last-update-time`.
- Deletion: the founding list has no delete; the service has a 30-day recycle bin.
- Automatic order buttons: the service moves one task per request, so a full reorder costs one request per task.

### Sources
- [rest-api-spec.md](https://github.com/gpellicciotta/todos/blob/main/docs/specs/rest-api-spec.md): endpoints, filters, roles, and errors.
- [business-logic-spec.md](https://github.com/gpellicciotta/todos/blob/main/docs/specs/business-logic-spec.md): memberships, sharing roles, overdue handling, recycle bin, and export.
- [data-model-spec.md](https://github.com/gpellicciotta/todos/blob/main/docs/specs/data-model-spec.md): lists, tasks, memberships, and ordering keys.
- [requirements.md](https://github.com/gpellicciotta/todos/blob/main/docs/requirements.md): the service requirements.
- [spa-spec.md](https://github.com/gpellicciotta/todos/blob/main/docs/specs/spa-spec.md) and the `webapp/` folder of todos: legacy feature inventory only; it is frozen.
- [ADR-0001](https://github.com/gpellicciotta/todos/blob/main/docs/adrs/ADR-0001-offline-first-architecture.md) and [ADR-0002](https://github.com/gpellicciotta/todos/blob/main/docs/adrs/ADR-0002-zero-dependency-client-libraries.md): offline-first and client library decisions.
- The todos backlog tasks T0136 to T0141: sync protocol gaps still being specified.

### Known Inputs
- Tasks belong to zero, one, or many lists; each list keeps its own hand-edited task order.
- Task fields: description, status (`todo`, `in-progress`, `completed`, `cancelled`), due time, and overdue handling (`keep`, `cancel`).
- Lists are shared with the roles `viewer`, `task-editor`, and `editor`; the owner holds all rights.
- Deleted lists and tasks stay in a recycle bin for 30 days.
- Clients generate UUIDv7 identifiers, and repeated creates with the same identifier are idempotent.
- The service authenticates with bearer session tokens issued by the Auth service.
- The JavaScript client library in todos `clients/js` already holds an IndexedDB store and a mutation queue.

### Decisions
Answered by the user on 2026-11-03:
- Local use needs no account: one anonymous local data set per browser profile.
- Online-only: cross-device sync and sharing; everything else works offline.
- Backup export and import work without a server, as one JSON file.
- Notes are timestamped entries with author, not one free-text field.
- First connect uploads local data into the account; disconnect keeps own data locally.
- Deletion uses a 30-day recycle bin, offline too.
- Automatic order buttons sort the view only and never change the stored manual order.
- Conflicts merge per field; the most recent edit of a field wins without asking.
- Connected overwrite import replaces own data only; lists of other owners stay untouched.
- Installable PWA with native ES modules and support.js, no framework or build step.
- Targets the latest Chrome, Edge, Firefox, and Safari on desktop, Android, and iOS.
- GitHub Pages hosting; US English UI with strings in one module.

Review remarks by the user on 2026-11-03:
- The design system is new, or reused from family-portal; not support.js.
- Several accounts or servers per device come after v1.0.0.
- Broadcasts and notifications come after v1.0.0.
- The admin console stays outside this project.
- Out of scope: CSV import and export, and profile management.

Decided by the agent on 2026-11-03, open to change in review:
- One account and one server at a time; the server URL is configurable.
- Local lists merge into account lists with the same name on first connect.
- Disconnecting removes lists owned by other users.
- Sharing actions are disabled while offline.
- A date-only due time means 23:59 local time.
- Performance target of 200 ms per view with 5000 tasks is an estimate.
