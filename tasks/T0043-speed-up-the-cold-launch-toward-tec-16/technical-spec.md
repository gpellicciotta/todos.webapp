### Declared Files
- src/js/app.js
- src/index.html
- src/js/views/task-list.js
- src/js/views/reorder.js
- src/js/views/list.js
- src/css/app-components.css
- src/service-worker.js
- tests/unit/task-list.test.js
- tests/unit/reorder.test.js
- tests/unit/modulepreload.test.js
- tests/e2e/long-list.spec.js
- docs/specs/ui-design.md

Size estimate: 12 files, 700 lines

Size note: The task combines three goals in the front end; the cold-launch and row-height changes share the list and start-up code.

### Tests
- Unit: modulepreload.test.js checks every module is preloaded; task-list.test.js lays out 5000 rows of 48 and 96 px; reorder.test.js drops by given row middles.
- Integration: long-list.spec.js scrolls 1200 rows of mixed heights in Chromium and checks first rows paint before the shell is ready.

Completion check: npx vitest run && npx playwright test
