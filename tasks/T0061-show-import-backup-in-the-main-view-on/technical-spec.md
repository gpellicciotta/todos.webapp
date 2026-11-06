### Design
- **[Decided]** Wide layouts (from 64rem) keep the modal dialog; compact layouts open the same dialog non-modally in the main view.
- **[Decided]** The dialog moves into the app grid, in the main column area, like the editor slot, so the top and bottom bars stay usable.
- **[Decided]** The in-view panel has no scrim, radius, or shadow, and fills the main column; its header matches the editor panel's.
- **[Decided]** The Tab trap and focus handling suit a modal; the in-view panel skips the trap, and Escape and the close button still cancel.
- **[Decided]** A route change cancels the in-view import unless the import is running.

### Declared Files
- src/js/views/import-dialog.js
- src/js/ui/dialog.js
- src/css/controls.css
- src/service-worker.js
- scripts/draw-wireframes.py
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- CHANGELOG.md
- tests/unit/import-dialog.test.js
- tests/unit/dialog.test.js
- tests/e2e/backup.spec.js
- tests/test_draw_wireframes.py

Mechanical: `docs/img/ui/import.svg` (`python scripts/draw-wireframes.py docs/img/ui`) and `scripts/sw-precache-hashes.json` (`node scripts/check-sw-version.mjs --update`).

Size estimate: 12 files, 300 lines

### Tests
- Unit: on a compact viewport the import opens non-modally inside the app root, with the in-view class and no scrim.
- Unit: on a wide viewport it still opens as a modal dialog on the body.
- Unit: a hash change cancels the in-view import, except while the import runs; Escape and the close button cancel it.
- Integration: End-to-end at 390 px: the top bar and bottom bar stay visible and enabled, the panel fills the main column, and a valid backup imports.
- Integration: End-to-end at 1440 px: the modal dialog behaves as before.

Completion check: `npm test`, `npm run lint`, `npx playwright test`, and `npm run check:sw`
