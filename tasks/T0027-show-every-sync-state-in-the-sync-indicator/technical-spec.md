## Technical Specifications

### Declared Files
- src/js/views/sync-indicator.js
- src/js/views/sync-log.js
- tests/unit/sync-indicator.test.js
- tests/e2e/sync.spec.js

Size estimate: 4 files, 350 lines

### Tests
- Unit: each engine state maps to its icon, label, and popover content.
- Integration: going offline with pending changes shows "Offline · n pending", and going online syncs them.
- Integration: an overwritten value shows the dot; opening the sync log clears it and lists the entry.

Completion check: `npm test && npm run lint && npm run test:e2e`
