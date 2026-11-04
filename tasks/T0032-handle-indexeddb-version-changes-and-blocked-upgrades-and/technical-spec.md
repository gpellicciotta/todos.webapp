## Technical Specifications

### Declared Files
- src/js/store/db.js
- tests/unit/store-db.test.js
- docs/specs/local-store.md

Size estimate: 3 files, 200 lines

### Tests
- Unit: a newer database version opened elsewhere closes this connection and notifies the app.
- Unit: an upgrade blocked by an older open connection rejects with a `blocked` StoreError.
- Unit: subscribers hear about list, task, membership, and note changes, also from another connection.
- Integration: two store instances on one database see each other's changes through the broadcast.

Completion check: `npm test && npm run lint`
