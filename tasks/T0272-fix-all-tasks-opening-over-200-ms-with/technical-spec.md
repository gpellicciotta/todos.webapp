## Technical Specifications

Cause: each All tasks opening read every record of six stores, occurrences and events included, and took about 289 ms at 4x throttling.
The profile showed the time in IndexedDB reads and their deserialization, not in rendering, which already windows rows.
Fix: All tasks reads only lists, tasks, memberships, and notes, and shares one cached read between openings until the next store write.

### Declared Files
- src/js/store/bulk.js
- src/js/store/db.js
- src/js/core/list-snapshot.js
- src/js/views/all-tasks.js
- src/js/app.js
- tests/unit/list-snapshot.test.js
- tests/e2e/all-tasks.spec.js

### Tests
- Unit: the shared read happens once until a write, holds four stores, and All tasks renders from it without reading the store.
- Integration: the performance spec opens All tasks with 5000 tasks under 4x throttling within 200 ms.

Completion check: npx playwright test --config playwright.perf.config.js
