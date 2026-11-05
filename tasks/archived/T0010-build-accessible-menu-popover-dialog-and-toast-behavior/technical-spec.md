## Technical Specifications

### Declared Files
- src/js/ui/popover.js
- src/js/ui/menu.js
- src/demo/visual-style-gallery-behaviors.js
- src/demo/visual-style-gallery.html
- tests/unit/menu.test.js
- tests/e2e/behaviors.spec.js
- package.json

Size estimate: 7 files, 820 lines
Size note: split from the original 450-line estimate on 2026-11-04; menus build on the popover module.

### Tests
- Unit: a menu moves the active item with arrow keys, wraps at both ends, and selects with Enter.
- Unit: Escape and an outside click close a menu or popover and return focus to its trigger.
- Integration: in the gallery, keyboard alone opens, uses, and closes a menu and a popover.

Completion check: `npm test && npm run lint && npm run test:e2e`
