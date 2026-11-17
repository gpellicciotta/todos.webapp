## Technical Specifications

### Declared Files
- src/js/app.js
- src/js/views/lists.js
- src/js/core/list-snapshot.js
- tests/e2e/performance.spec.js
- tests/unit/list-snapshot.test.js

### Tests
- Unit: `list-snapshot.test.js` covers one shared read, a re-read after a write or `invalidate`, no kept failure, and the screen rendering without reading tasks.
- Integration: `performance.spec.js` seeds 150 lists and 5000 tasks, opens Lists under 4x CPU throttling, and asserts a median under 200 ms.

Completion check: `npm run test:perf -- -g "Lists opens"`
