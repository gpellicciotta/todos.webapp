## Technical Specifications

### Declared Files
- src/css/app-components.css
- src/css/style.css
- src/img/icons.svg
- src/demo/visual-style-gallery.html
- tests/e2e/gallery-app.spec.js
- docs/specs/visual-style-guide.md

Size estimate: 6 files, 700 lines
Size note: the components and their gallery sections must merge together.

### Tests
- Unit: the raw color literal check passes for app-components.css.
- Integration: task row specimens keep one line at 48 px, truncating long descriptions at 390 px.
- Integration: completed rows are muted without strike-through; cancelled rows are muted and struck through.
- Integration: all app gallery sections render at 390 and 1440 px in both themes without console errors.

Completion check: `npm test && npm run lint && npm run test:e2e`
