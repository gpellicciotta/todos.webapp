### Declared Files
- src/js/views/view-controls.js
- src/js/views/editor-panel.js
- src/js/views/list.js
- src/js/views/all-tasks.js
- src/js/ui/router.js
- src/js/app.js
- src/css/app-components.css
- src/css/views.css
- src/demo/visual-style-gallery.html
- tests/unit/view-controls.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/list.spec.js
- tests/e2e/gallery-app.spec.js
- tests/unit/all-tasks.test.js
- tests/unit/list.test.js
- tests/unit/router.test.js
- src/service-worker.js
- CHANGELOG.md
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Mechanical command: `node scripts/check-sw-version.mjs --update` writes scripts/sw-precache-hashes.json, which is not counted.

Size estimate: 21 files, 2227 lines
Size note: Above the typical line. The panel, menu entries, and info line replace one control bar and cannot merge apart. A human approved 21 files, 2227 lines.

### Tests
- Unit: info line text for the defaults, each filter, the sort, and Reset; the count reads "12 of 24 tasks" when narrowed.
- Unit: the view-options routes parse and format, and the options persist per device (`TV-12`).
- Integration: End-to-end on both layouts: open Edit view options, change filters and sort, see the info line, and Reset.
- Integration: The All tasks More menu holds only Edit view options; the list More menu holds the four entries.

Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`

### Design
See [ui-design.md](../../../docs/specs/ui-design.md), sections Search and Add and View Options, and
[view-options.svg](../../../docs/img/ui/view-options.svg).
