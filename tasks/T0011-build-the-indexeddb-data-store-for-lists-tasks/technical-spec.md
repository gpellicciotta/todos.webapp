## Technical Specifications

### Decisions
- Field names follow the REST API schemas in kebab-case, such as `due-time` and `overdue-handling`.
- The schema has a version number and an upgrade function, so later tasks can add stores.
- Every write updates `last-update-time`; tasks also keep `last-activity-time` (`TSK-12`).
- Vitest uses `fake-indexeddb` as a development dependency.

### Declared Files
- src/js/lib/uuid7.js
- src/js/store/db.js
- src/js/store/lists.js
- src/js/store/tasks.js
- tests/unit/uuid7.test.js
- tests/unit/store-lists.test.js
- tests/unit/store-tasks.test.js
- package.json
- docs/specs/local-store.md
- docs/index.md

Size estimate: 10 files, 650 lines
Size note: the schema and its first two record types cannot merge apart and stay testable.

### Tests
- Unit: UUIDv7 values are valid version 7 UUIDs and sort by creation time.
- Unit: list names of 1 to 100 characters are accepted; duplicates differing only in case are rejected.
- Unit: a new task defaults to `todo` and `keep`; descriptions over 500 characters are rejected.
- Unit: a task joins and leaves several lists, and changing any field updates its timestamps.
- Integration: data written in one database connection is read back after closing and reopening it.

Completion check: `npm test && npm run lint`
