### Decisions
- **[Decided]** New tokens: `--color-status-in-progress`, `--color-status-completed`, `--color-status-cancelled`.
- **[Decided]** Cancelled icon uses the danger color; its row text stays muted gray.
- **[Decided]** Completed rows strike through their text, like cancelled rows.
- Blue must stay clearly different from the navy signal color; verify side by side in the gallery.
- Done rows keep muted description text; only the icon takes the status color.
- Applies to the status button and the status menu.

### Declared Files
- src/css/tokens.css
- src/css/app-components.css
- src/css/controls.css
- src/demo/visual-style-gallery.html
- docs/specs/visual-style-guide.md
- tests/unit/tokens.test.js
- tests/e2e/gallery-app.spec.js
- CHANGELOG.md

Size estimate: 8 files, 110 lines

### Tests
- Unit: each status token exists in light and dark and reaches 3:1 contrast on the surface and sunken colors.
- Unit: the in-progress blue differs from the signal navy by a minimum color distance.
- Integration: Playwright reads the computed icon color of each status button and menu item in both themes.
- Integration: the existing gallery spec still passes for row text colors.

Completion check: npm test && npx playwright test tests/e2e/gallery-app.spec.js
