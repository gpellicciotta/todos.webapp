## Technical Specifications

### Declared Files
- src/js/views/view-controls.js
- src/js/core/preferences.js
- tests/unit/view-controls.test.js

Size estimate: 3 files, 780 lines
Size note: the controls and their table-driven tests form one module.

### Tests
- Unit: filter and sort state round-trips through the per-device preferences (`TV-12`).
- Unit: preferences fall back to defaults when storage is empty or throws.
- Unit: compact layouts group the filters behind one Filters button with an active count.
- Integration: none (the All tasks screen task T0016 covers the controls end to end).

Completion check: `npm test && npm run lint`
