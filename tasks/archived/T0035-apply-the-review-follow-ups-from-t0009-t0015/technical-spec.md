## Technical Specifications

### Declared Files
- src/js/store/db.js
- src/js/ui/toast.js
- src/js/ui/layout.js
- src/js/app.js
- src/css/app-components.css
- src/demo/visual-style-gallery.html
- src/service-worker.js
- tests/unit/store-db.test.js
- tests/unit/toast.test.js
- tests/unit/tokens.test.js
- tests/e2e/shell.spec.js
- tests/e2e/gallery-app.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- docs/specs/local-store.md

Mechanical command: `node scripts/check-sw-version.mjs --update` (regenerates scripts/sw-precache-hashes.json)

Size estimate: 10 files, 420 lines

### Tests
- Unit: a throwing subscriber never fails a committed write, and every facade write notifies subscribers.
- Unit: Ctrl or Cmd+Z runs only Undo actions, never a Reload, and not while a modal is open.
- Integration: a route change moves focus to main or announces the route, and the Reload offer stays as a banner.
- Unit: app-components.css and app-chrome.css scale no token by a bare number.
- Integration: a stored theme sets every `theme-color` meta, and a start-up failure shows an error banner.
- Integration: a read-only row's disabled status button stays flat on hover; a selected row shows press feedback.
- Integration: the selected row edge is a logical inset; the task list pattern shows only open rows under "Status: open".

Completion check: `npm test && npm run lint && npm run test:e2e && npm run check:sw`
