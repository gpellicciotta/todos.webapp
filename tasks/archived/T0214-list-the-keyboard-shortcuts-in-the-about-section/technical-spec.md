## Technical Specifications

### Background
- `docs/specs/ui-design.md` (Accessibility and Input) says: "Shortcuts never fire while a text field has focus, and the About section lists them."
- The About section in `src/js/views/settings.js` (`aboutSection`) shows only the version, the build date, and the source link.
- No shortcut list exists in the app today, so the Add bar shortcuts of commit a607f2f are hard to discover.

### Behavior
- **[Decided]** About gets a "Keyboard shortcuts" list under the version line and above the source link.
- **[Decided]** It lists only shortcuts that work today; backlog tasks add their own rows when they ship.
  - T0073 adds `l`, T0074 adds `/` on the Lists screen, and T0076 adds Alt+Shift+Up and Alt+Shift+Down.
- **[Decided]** Rows, in this order, with the key text exactly as shown:
  - `n` or `/`: Focus the search and add field.
  - `Shift+Enter` or `Alt+Enter`: Add the typed task, in the search and add field.
  - `Escape`: Clear the search and add field, or close the editor or a dialog.
  - `Alt+Up` or `Alt+Down`: Move the focused list, or the focused task in a list's manual order.
  - `Ctrl+Z` or `Cmd+Z`: Undo the newest change shown in a toast.
- **[Decided]** Markup: a `<dl>` with each key in a `<kbd>` element; the terms read as text to screen readers.
- **[Decided]** The rows live in one frozen array in `settings.js` next to `STRINGS`, so tests and rendering share it.
- **[Decided]** Style `kbd` as a base element in `style.css`, beside `code`, with existing semantic tokens only.
  - The ui-guidelines skill requires the gallery and the visual style guide to show it, so both change too.
- The list is static text: no buttons, no remapping, and no platform detection.

### Declared Files
- src/js/views/settings.js
- src/css/style.css
- src/css/views.css
- src/demo/visual-style-gallery.html
- docs/specs/visual-style-guide.md
- tests/unit/settings.test.js
- tests/e2e/bin-settings.spec.js
- docs/specs/ui-design.md
- CHANGELOG.md
- src/service-worker.js (one-line VERSION bump)

Mechanical command: `node scripts/check-sw-version.mjs --update` (rewrites `scripts/sw-precache-hashes.json`).
Size estimate: 10 files, 180 lines
Size note: The shared kbd style needs its gallery and guide entries; without a consumer it has no reason to merge alone.

### Tests
- Unit: `mountSettings` renders a "Keyboard shortcuts" heading in About with five rows in the order above.
- Unit: each row's term holds `<kbd>` elements whose text matches the keys above, and its description matches the text above.
- Unit: the list sits after the version line and before the source link.
- Integration: open `#/settings` in Playwright at 1440 px and 390 px; the About section shows all five rows.
- Integration: the same run reports no console errors and no horizontal page scroll at 390 px.

### Visual
- Capture before and after screenshots of the About section at 390 px and 1440 px, light and dark.
- Store them in `.plan/tasks/T0214-list-the-keyboard-shortcuts-in-the-about-section/`.

Completion check: `npm test && npm run test:e2e -- tests/e2e/bin-settings.spec.js && npm run check:sw`
