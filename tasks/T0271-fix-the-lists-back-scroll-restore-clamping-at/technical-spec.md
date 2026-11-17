### Declared Files
- src/css/views.css
- src/js/ui/router.js
- tests/unit/router.test.js
- tests/e2e/lists-many-rows.spec.js
- docs/specs/ui-design.md

### Tests
- Unit: a router scroll restore clamped by the browser retries per frame until the target holds.
- Integration: the Lists Back e2e restores the scroll of 300 rows, repeated 10 times.

Completion check: npx playwright test tests/e2e/lists-many-rows.spec.js --repeat-each=10 --project=chromium
