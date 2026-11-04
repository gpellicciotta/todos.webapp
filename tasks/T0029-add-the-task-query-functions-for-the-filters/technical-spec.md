## Technical Specifications

### Decisions
- Queries run in memory over the local store; the data set stays small enough for that (`TEC-16`).
- Filters AND together; a multi-value filter matches any of its values; ties break on task identifier.

### Declared Files
- src/js/core/query.js
- tests/unit/query.test.js
- docs/specs/local-store.md

Size estimate: 3 files, 620 lines
Size note: one module and its table-driven tests; splitting further adds no value.

### Tests
- Unit: filters combine with AND, and multi-value filters match any value; "in no list" works.
- Unit: the Due filter handles Overdue, Today, This week, a range, and No due time.
- Unit: text search matches descriptions and notes, ignoring case.
- Unit: sorting by due time puts tasks without a due time last in both directions.
- Integration: a list of 5000 tasks filters and sorts in under 50 ms in Node.

Completion check: `npm test && npm run lint`
