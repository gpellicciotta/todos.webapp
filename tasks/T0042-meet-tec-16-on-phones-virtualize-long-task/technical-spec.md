## Technical Specifications

### Declared Files
- src/js/views/task-list.js
- src/js/views/list.js
- src/js/views/reorder.js
- tests/unit/task-list.test.js
- tests/e2e/performance.spec.js

Size estimate: 5 files, 500 lines

### Tests
- Unit: only visible rows plus a buffer are in the DOM, and scrolling renders the rows that come into view.
- Unit: moves and drag targets work across rows that are not rendered yet.
- Integration: with 5000 tasks and 4x CPU throttling through CDP, All tasks paints its first rows within 200 ms.

Completion check: `npm test && npm run lint && npm run test:e2e && npm run test:perf && npm run check:sw`
