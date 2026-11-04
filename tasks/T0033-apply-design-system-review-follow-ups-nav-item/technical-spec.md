## Technical Specifications

### Declared Files
- src/css/app-chrome.css
- src/css/tokens.css
- src/demo/visual-style-gallery.html
- src/js/ui/toast.js
- src/js/ui/live-region.js
- tests/unit/toast.test.js
- tests/unit/live-region.test.js
- tests/unit/tokens.test.js
- tests/e2e/gallery-chrome.spec.js

Size estimate: 9 files, 300 lines

### Tests
- Unit: a toast shown while a modal is open waits until the modal closes.
- Unit: Ctrl or Cmd+Z outside text fields runs the newest toast's Undo, and does nothing inside a field.
- Unit: the live region uses the `.visually-hidden` class and no inline styles.
- Integration: the current nav item shows hover and active feedback and keeps its edge in right-to-left layouts.

Completion check: `npm test && npm run lint && npm run test:e2e`
