## Technical Specifications

### Decisions
- Themes use `light-dark()` on semantic tokens, with `data-theme` overrides on `<html>`.
- Inter comes from its official release as one variable `woff2` file, with `OFL.txt` beside it.
- Font files and the license are copied, not hand-edited, so they leave the size count.

### Declared Files
- src/css/style.css
- src/css/tokens.css
- src/css/fonts.css
- src/demo/visual-style-gallery.html
- src/demo/visual-style-gallery.css
- tests/unit/tokens.test.js
- tests/e2e/gallery.spec.js
- docs/specs/visual-style-guide.md

Size estimate: 8 files, 550 lines, plus the font and license files
Size note: tokens and their gallery sections change together, as the UI guidelines require.

### Tests
- Unit: every semantic text and background pair in tokens.css meets 4.5:1 in light and dark themes.
- Unit: no stylesheet outside tokens.css contains a raw color literal.
- Integration: the gallery loads at 390 and 1440 px in both themes, without console errors or horizontal scrolling.
- Integration: the gallery's computed body font is Inter, loaded from the local font file.

Completion check: `npm test && npm run lint && npm run test:e2e`
