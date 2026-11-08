## Technical Specifications

### Behavior
- **[Decided]** Empty recycle bin permanently removes every bin entry, lists and tasks, with their memberships and notes.
- **[Decided]** It runs in one read-write transaction over all stores, so it either removes everything or nothing.
- **[Decided]** It queues nothing for sync, as `purgeForever` and `purgeExpired` do (`docs/specs/local-store.md`). It stays available while connected.
- **[Decided]** The button sits above the rows, hidden while the bin is empty.
- **[Decided]** The button asks in place first, with the count: "Permanently delete 3 lists and 12 tasks? This cannot be undone." Buttons: Keep and Delete all. Escape or Keep closes the question.
- **[Decided]** A toast confirms: "Recycle bin emptied."
- **[Decided]** A failure keeps the screen as it was and shows a toast, as `purgeFailed` does for one entry.
- **[Decided]** Lists and tasks never delete each other (`LST-6`, `LST-7`), so a purged list leaves its live tasks in place.

### Store API
- `emptyBin(ctx)` in `src/js/store/bin.js` returns the purged entries as `{type, id}[]`.
- It reuses `removeRecord` for every record whose `deletion-time` is set.
- The facade adds `emptyBin` to `WRITES`, so subscribers hear of it once it commits.

### Declared Files
- src/js/store/bin.js
- src/js/store/db.js
- src/js/views/recycle-bin.js
- tests/unit/bin.test.js
- tests/unit/recycle-bin.test.js
- docs/requirements.md
- docs/specs/local-store.md
- docs/specs/ui-design.md
- CHANGELOG.md

### Tests
- Unit: `emptyBin` removes deleted lists and tasks with memberships and notes, keeps live records, returns the purged entries, and rolls back on a failed write.
- Unit: `emptyBin` on an empty bin returns an empty array and changes nothing; subscribers hear of a non-empty run once.
- Unit: the screen hides the button for an empty bin, asks with the count, closes on Keep and Escape, empties on Delete all, and toasts on success and failure.
- Integration: with a fake IndexedDB, delete two lists and three tasks, open the recycle bin, confirm Empty recycle bin, and see the empty bin text and the toast; reload and see the bin still empty.

Completion check: `npm test`
