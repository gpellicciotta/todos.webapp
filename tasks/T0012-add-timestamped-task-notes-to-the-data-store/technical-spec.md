## Technical Specifications

### Declared Files
- src/js/store/db.js
- src/js/store/notes.js
- src/js/store/tasks.js
- tests/unit/store-notes.test.js
- docs/specs/local-store.md

Size estimate: 5 files, 270 lines

### Tests
- Unit: notes of 1 to 2000 characters are accepted; empty or longer notes are rejected.
- Unit: listing a task's notes returns them newest first.
- Unit: editing a note sets its edit time, and every note change updates the task's last activity time.
- Integration: the schema upgrade adds the notes store without losing existing lists and tasks.

Completion check: `npm test && npm run lint`
