## Technical Specifications

### Design
- **[Decided]** The top bar opens with the vendored `app__nav-toggle` icon button, drawing a new `nav-menu` sprite icon.
  The sidebar gets `id="app-nav"` and the `popover` attribute; `attachAppNav` from vendored app-nav.js drives both.
- **[Decided]** From 64rem each press cycles the sidebar through open, an icon rail, and hidden, as support.webapp defines.
  Below 64rem the bottom bar navigates, so shell.css hides the toggle; the compact layout stays as it is.
- **[Decided]** The rail shows every list row as a monogram tile in the glyph column: the first letter of the name, uppercased.
  The tile is `icon-md` square, on the sunken ground with muted text; the current list uses the signal color.
  Rejected: clipping list rows to nothing, which leaves the rail with two links and no lists.
  Rejected: a generic list icon per row, which makes every row look the same.
- **[Decided]** The open sidebar keeps its look: the monogram hides there and list rows keep their label indent.
- **[Decided]** The rail hides the find field, its no-match line, and the sidebar separator; entering the rail clears the find text.
  Labels and counts stay in the links, clipped, so the accessible names keep the name and the open count.
  Every sidebar link carries a `title`, so a hover shows the clipped name.
- **[Decided]** The wide state persists per device in `todos.view.nav` as `"open"`, `"rail"`, or `"hidden"`, default `"open"`.
  It never syncs (`SYN-13`), like the panel widths.
- **[Decided]** The sidebar brand stays at the top of the sidebar; the rail clips its name and keeps the icon.

### Declared Files
- src/js/ui/layout.js
- src/js/core/preferences.js
- src/css/app-chrome.css
- src/img/icons.svg
- src/index.html
- src/service-worker.js
- src/demo/visual-style-gallery.html
- tests/unit/layout.test.js
- tests/unit/preferences.test.js
- tests/e2e/shell.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- docs/specs/local-store.md
- src/css/views.css (added during execution)
- tests/unit/design-system.test.js (added during execution)
- tests/e2e/gallery-chrome.spec.js (added during execution)

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 13 files, 450 lines
Size note: one UI feature; the gallery, guide, and specs must change with it, and no split piece merges alone.

### Tests
- Unit: preferences reads `todos.view.nav`, falling back to open for missing or unknown values, and writes it.
- Unit: the shell's top bar starts with the toggle, whose `aria-controls` and `popovertarget` name the sidebar popover.
- Unit: list rows hold an `aria-hidden` monogram of the first letter; renames update it; links carry a `title`.
- Unit: a stored rail state renders the rail; a wide press cycles open, rail, hidden and stores each state.
- Unit: entering the rail clears the find text.
- Integration: at 1440 px, pressing the toggle narrows the sidebar to a rail with visible monograms, then hides it.
  The state survives a reload; a rail list link opens its list; at 390 px the toggle stays hidden.

Completion check: npx vitest run tests/unit/layout.test.js tests/unit/preferences.test.js && npx playwright test tests/e2e/shell.spec.js
