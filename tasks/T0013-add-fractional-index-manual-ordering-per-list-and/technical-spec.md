## Technical Specifications

### Decisions
- Keys follow the fractional-indexing algorithm named in the service's data model spec, compared by byte order.
- Queries run in memory over the local store; the data set stays small enough for that (`TEC-16`).

### Declared Files
- src/js/lib/fractional-index.js
- src/js/store/tasks.js
- src/js/core/query.js
- tests/unit/fractional-index.test.js
- tests/unit/query.test.js

Size estimate: 5 files, 450 lines
Size note: ordering and querying share the membership model and its tests.

### Tests
- Unit: keys generated between two neighbors sort strictly between them, also after 1000 repeated inserts.
- Unit: keys match published fractional-indexing test vectors.
- Unit: moving a task in one list leaves its positions in other lists unchanged.
- Unit: filters combine with AND, and multi-value filters match any value; "in no list" works.
- Unit: sorting by due time puts tasks without a due time last in both directions.
- Integration: a list of 5000 tasks filters and sorts in under 50 ms in Node.

Completion check: `npm test && npm run lint`
