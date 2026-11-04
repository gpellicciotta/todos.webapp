## Technical Specifications

### Declared Files
- src/js/ui/dialog.js
- src/js/ui/toast.js
- src/js/ui/live-region.js
- src/demo/visual-style-gallery-behaviors.js
- src/demo/visual-style-gallery.html
- tests/unit/toast.test.js
- tests/unit/dialog.test.js
- tests/unit/live-region.test.js
- tests/e2e/behaviors.spec.js

Size estimate: 9 files, 750 lines
Size note: three small modules share the focus and announcement contract and one gallery wiring step.

### Tests
- Unit: a toast with Undo calls its callback when clicked, and expires after 8 seconds otherwise.
- Unit: a dialog traps Tab, closes on Escape, and returns focus to its opener.
- Unit: the live region announces a repeated message again.
- Integration: in the gallery, keyboard alone opens and closes a dialog and uses a toast's Undo.

Completion check: `npm test && npm run lint && npm run test:e2e`
