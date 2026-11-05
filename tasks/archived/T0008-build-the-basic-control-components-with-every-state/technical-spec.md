## Technical Specifications

### Declared Files
- src/css/controls.css
- src/css/style.css
- src/demo/visual-style-gallery.html
- src/demo/visual-style-gallery.css
- tests/e2e/gallery-controls.spec.js
- docs/specs/visual-style-guide.md

Size estimate: 6 files, 700 lines
Size note: controls and their gallery sections must merge together; splitting by control adds no value.

### Tests
- Unit: the raw color literal check from the tokens task passes for controls.css.
- Integration: each gallery control section renders at 390 and 1440 px in both themes without horizontal scrolling.
- Integration: every interactive specimen is at least 44 by 44 px and shows a visible focus ring.

Completion check: `npm test && npm run lint && npm run test:e2e`
