## Technical Specifications

### Declared Files
- src/js/ui/menu.js
- src/js/ui/dialog.js
- src/js/ui/toast.js
- src/js/ui/live-region.js
- src/demo/visual-style-gallery.html
- tests/unit/menu.test.js
- tests/unit/toast.test.js
- tests/e2e/behaviors.spec.js

Size estimate: 8 files, 450 lines
Size note: four small modules share one focus and keyboard contract and their gallery wiring.

### Tests
- Unit: a menu moves the active item with arrow keys, wraps at both ends, and selects with Enter.
- Unit: Escape and an outside click close a menu and return focus to its trigger.
- Unit: a toast with Undo calls its callback when clicked, and expires after 8 seconds otherwise.
- Integration: in the gallery, keyboard alone opens, uses, and closes a menu, a dialog, and a toast.

Completion check: `npm test && npm run lint && npm run test:e2e`
