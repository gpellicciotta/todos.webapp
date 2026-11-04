## Technical Specifications

### Decisions
- Keys follow the fractional-indexing algorithm named in the service's data model spec, compared by byte order.

### Declared Files
- src/js/lib/fractional-index.js
- src/js/store/tasks.js
- tests/unit/fractional-index.test.js

Size estimate: 5 files, 450 lines
Size note: split on 2026-11-04; the query module moved to T0029, leaving about 870 lines here.

### Tests
- Integration: a v1 or v2 database upgrades to v3, giving existing memberships positions in added-time order.
- Unit: keys generated between two neighbors sort strictly between them, also after 1000 repeated inserts.
- Unit: keys match published fractional-indexing test vectors.
- Unit: moving a task in one list leaves its positions in other lists unchanged.

Completion check: `npm test && npm run lint`
