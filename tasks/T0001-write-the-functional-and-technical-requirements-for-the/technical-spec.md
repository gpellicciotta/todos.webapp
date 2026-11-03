## Technical Specifications

### Founding Requirements
Stated by the user on 2026-11-03:
- The app works 100% offline and independently of the backend.
- The app can connect to the backend and then use it fully.
- The app lives in its own repository; the REST API is the only contract with the todos service.

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

### Open Questions
- Does local-only use need any account, or one anonymous local profile per browser?
- Must one device support several accounts or several servers?
- Which features stay online-only, such as sharing, invitations, notifications, export, and the admin console?
- Which conflict policy do users see: automatic per-field merge, or an explicit choice?
- Must the app be an installable PWA, and which browsers and devices must it support?
- Must local data be exportable and importable as a file without a server?
- Which languages must the UI support?
- Must the app use native web standards without a UI framework, like the other family apps?
- Where is the app hosted: a static host such as GitHub Pages, or the todos service?
