## Technical Specifications

### Declared Files
- src/js/views/recycle-bin.js
- src/js/views/settings.js
- src/js/core/preferences.js
- tests/unit/preferences.test.js
- tests/e2e/bin-settings.spec.js

Size estimate: 5 files, 400 lines
Combined task: the two screens are small and share the preferences module.

### Tests
- Unit: preferences read defaults when storage is empty or throws.
- Integration: restoring a task from the bin brings it back into its lists, with a toast linking to it.
- Integration: Delete permanently asks in the row, and Keep leaves the entry.
- Integration: choosing Dark sets `data-theme="dark"` at once and keeps it after a reload.

Completion check: `npm test && npm run lint && npm run test:e2e`
