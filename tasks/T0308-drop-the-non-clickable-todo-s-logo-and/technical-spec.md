## Technical Specifications

Remove the logo and app name from the top of the sidebar in the app, gallery, styles, wireframes, and specs.
The document title, favicon, sign-in logo, and install icons keep the app name and icon.

### Declared Files
- src/js/ui/layout.js
- src/css/app-chrome.css
- src/demo/visual-style-gallery.html
- src/service-worker.js
- scripts/draw-wireframes.py
- docs/devops.md
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- tests/unit/layout.test.js
- tests/unit/app-icons.test.js
- tests/e2e/pwa.spec.js
- tests/test_draw_wireframes.py

Mechanical command: python scripts/draw-wireframes.py docs/img/ui
Mechanical files: docs/img/ui/*.svg

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

### Tests
- Unit: the sidebar starts with the destinations, and no source or wireframe holds a brand.
- Integration: the full Playwright suite passes, including the offline icon check.

Completion check: python scripts/devops.py check

Size estimate: 12 files, 80 lines

Size note: One removal spans code, specs, and tests; a split piece could not merge on its own.
