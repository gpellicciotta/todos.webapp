## Technical Specifications

### Declared Files
- src/js/views/recycle-bin.js
- src/js/store/bin.js
- src/js/store/db.js
- tests/unit/recycle-bin.test.js
- tests/unit/bin.test.js
- tests/e2e/bin-settings.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- docs/specs/local-store.md

Size estimate: 9 files, 420 lines.
Size note: the store calls and the toolbar cannot merge apart, since neither is reachable alone.

### Requirement
- BIN-9: Users restore, or permanently delete after confirming, every entry that matches the recycle bin filter.

### Toolbar
- Unfiltered, the toolbar shows Empty recycle bin as today.
- Filtered with at least one match, it shows Restore {{n}} and Delete {{n}} permanently instead.
- With no match, it shows neither.

### Delete Matches
- It asks in place: "Permanently delete 1 list and 2 tasks that match? This cannot be undone." with Keep and Delete all.
- Escape or Keep closes the question.
- While connected it follows Delete permanently: device-only before T0249, synced to the account after it.
  If T0249 has landed, `purgeEntries` queues one `purge` entry per entry, as T0249 specifies.
- A toast says "Deleted 1 list and 2 tasks permanently."; a failure keeps the question open, with a toast.

### Restore Matches
- It restores at once; a toast says "Restored 1 list and 2 tasks."
  One restored entry gets the usual toast with a link to it (`BIN-3`).
- Restored entries bring back their memberships (`BIN-3`); while connected each restore queues as today (`SYN-1`).
- An entry past its purge time is skipped, and the toast adds "1 could no longer be restored."

### Store
- `restoreEntries(entries)` and `purgeEntries(entries)` take `{type, id}` pairs.
- Each runs in one transaction and returns what it restored or purged.
- `purgeEntries` queues exactly as `purgeForever` does at the time this task runs.

### After an Action
- The filter stays; the info line and the rows update.
- Focus moves to the find field.

### Tests
- Unit: `restoreEntries` restores the given entries with memberships in one transaction, skipping expired ones.
- Unit: `purgeEntries` purges the given entries, with memberships and notes, and nothing else.
- Unit: the toolbar swaps Empty recycle bin for Restore and Delete while filtered, with the match count.
- Unit: the delete question, Keep, Escape, the toasts, and focus after each action.
- Integration: the bin-settings e2e spec filters to tasks, restores them all, then filters again and deletes the matches.

Completion check: `npm test` and the bin-settings e2e spec pass.
