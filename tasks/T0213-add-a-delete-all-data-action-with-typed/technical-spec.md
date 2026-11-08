## Technical Specifications

### Behavior
- **[Decided]** Delete all data permanently removes every list, task, note, membership, and recycle bin entry on this device. It is not a soft delete.
- **[Decided]** It keeps the theme and the server URL preference. They are settings, not data.
- **[Decided]** It is unavailable while connected. The button is disabled with the hint "Disconnect first. Deleting here never removes data from your account." This mirrors Overwrite import (`import-dialog.js`).
- **[Decided]** It runs in one read-write transaction over lists, tasks, memberships, and notes, so it either erases everything or nothing.
- **[Decided]** The dialog names the counts, offers Export backup first, and enables the Delete everything button only after the user types `DELETE`. The match is exact and case-sensitive.
- **[Decided]** Cancel, Escape, and a backdrop click change nothing.
- **[Decided]** A toast confirms: "All data deleted." Open views then show the empty states.
- **[Decided]** The button uses the danger style and sits last in the Data section.
- **[Feedback Needed]** While connected, should a later task add a variant that also removes the account's copy? This task does not.

### Store API
- `deleteAllData(ctx)` in `src/js/store/bin.js` clears the four data stores and returns `{lists, tasks}` counts.
- It leaves the sync stores (`sync-queue`, `sync-state`, `sync-log`) alone, which holds while not connected.
- The facade adds `deleteAllData` to `WRITES`.

### Declared Files
- src/js/store/bin.js
- src/js/store/db.js
- src/js/views/settings.js
- tests/unit/bin.test.js
- tests/unit/settings.test.js
- docs/requirements.md
- docs/specs/local-store.md
- docs/specs/ui-design.md
- CHANGELOG.md

### Tests
- Unit: `deleteAllData` clears lists, tasks, memberships, notes, and bin entries, returns the counts, leaves the sync stores, and rolls back on a failed write.
- Unit: `deleteAllData` on a fresh store returns zero counts; subscribers hear of the run once.
- Unit: the Settings button is disabled with the hint while connected; the dialog keeps its confirm button disabled until `DELETE` is typed exactly; Cancel and Escape call nothing; success toasts, failure shows an error.
- Integration: with a fake IndexedDB, add lists, tasks, and bin entries, open Settings, type `DELETE`, confirm, and see the Lists screen empty and the theme unchanged; reload and see the data still gone.

Completion check: `npm test`
