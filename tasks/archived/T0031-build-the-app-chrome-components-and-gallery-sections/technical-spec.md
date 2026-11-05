## Technical Specifications

### Declared Files
- src/css/app-chrome.css
- src/css/style.css
- src/demo/visual-style-gallery.html
- src/demo/visual-style-gallery.css
- tests/e2e/gallery-chrome.spec.js
- tests/unit/tokens.test.js
- docs/specs/visual-style-guide.md

Size estimate: 7 files, 1000 lines
Size note: the chrome styles and their gallery sections must merge together.

### Tests
- Unit: the raw color literal check and the style.css import order cover app-chrome.css.
- Integration: navigation marks the current route with `aria-current` in both layouts.
- Integration: each sync indicator state shows its own icon and label, plus the unseen-entries dot.
- Integration: the chrome sections render at 390 and 1440 px in both themes without console errors or horizontal scrolling.

Completion check: `npm test && npm run lint && npm run test:e2e`
