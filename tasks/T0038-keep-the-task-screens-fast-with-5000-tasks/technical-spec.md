## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- src/js/views/view-controls.js
- src/js/views/all-tasks.js
- src/js/ui/layout.js
- tests/unit/task-list.test.js
- tests/e2e/performance.spec.js

Size estimate: 6 files, 400 lines

### Tests
- Unit: a store change that touches one task updates only that task's row and keeps the other row elements.
- Unit: typing in search runs one query after the debounce delay, not one per keystroke.
- Integration: with 5000 seeded tasks, All tasks renders within 400 ms in desktop Chromium, as a proxy for 200 ms on phones.
- Integration: the minute tick keeps an open status menu open and focus in place.

### Follow-Ups From Earlier Reviews
- From T0020: the bin's 60 s redraw rebuilds rows; redraw only when the local date changes.
- The other review follow-ups moved to T0041 on 2026-11-04.

Completion check: `npm test && npm run lint && npm run test:e2e && npm run check:sw`
