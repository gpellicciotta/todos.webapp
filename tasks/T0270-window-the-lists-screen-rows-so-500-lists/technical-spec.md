## Technical Specifications

### Design
- **[Decided]** Window the Lists screen rows past 200 shown lists, the threshold of task rows.
- Up to 200 shown lists render every row, so find in page stays whole there.
- Past 200, render the rows in view plus 10 each side; padding and row margins hold the rest.
- A resize observer measures rendered rows; the shortest sets the height of unrendered rows.
- The tab stop, the focused row or open menu, and a dragged row stay rendered.
- Row keys, the find field Down key, and drags work over every shown list.
- Rows carry `aria-posinset` and `aria-setsize`.

### Declared Files
- src/js/views/lists.js
- src/css/views.css
- docs/specs/ui-design.md
- src/service-worker.js
- tests/unit/lists-many-rows.test.js
- tests/e2e/lists-many-rows.spec.js
- tests/e2e/performance.spec.js

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

### Tests
- Unit: 300 lists render a window with padding and set sizes; 200 render every row.
- Unit: Down, Home, End, PageUp, PageDown, Alt+Up, and the find field reach unrendered rows.
- Integration: lists-many-rows.spec.js covers scrolling, keys, tab stop, drag, and Back scroll with 300 lists.
- Integration: performance.spec.js asserts 500 lists open within twice the 150-list time.

Completion check: npx playwright test --config playwright.perf.config.js -g "Lists with many lists"

Size estimate: 7 files, 620 lines
Size note: windowing and the tests it changes are one concern; splitting would leave failing tests.
