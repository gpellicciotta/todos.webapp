# T0231 Technical Specification
Move the app layout onto the vendored shell.css, with the action bar, side panel, and overlay layer.

---

## Starting Point
- T0230 vendored support.webapp 0.1.0 into `src/vendor/design/` and moved every token to it (commit `56e799b`).
- `style.css` imports four private vendored token files; T0233 later switches to the public `looks/neutral/index.css`.
- **[Decided]** with the user on 2026-11-13: the original T0231 is split; this task keeps the shell, T0233 takes the components.
- `shell.css` is private too, so this task adds it to T0230's direct imports; T0233 removes all of them.
- The vendored check warns on three fixed or sticky positions: `app-shell.css`, `controls.css` (toast region), `views.css` (add bar).
  This task moves them into shell areas and tightens `tests/unit/design-system.test.js` to accept no warnings.

## Scope Found at Read Time
Read on 2026-11-13 at `56e799b`:
- `ui/layout.js` builds the top bar, sidebar, main column, editor slot, bottom bar, and toast region.
  It must emit the ADR-0004 markup: `app__banners`, `app__side-panel`, `app__action-bar`, `app__overlays`, `app__nav-item`.
- The add bar (`views/add-bar.js`, `views.css`) becomes the action bar; the editor slot (`views/editor-panel.js`) the side panel.
- The floating button (`views/lists.js`) and the toast region (`ui/toast.js`) move into `app__overlays`.
- `app-shell.css` goes; `app-chrome.css` and `views.css` lose their layout rules.
- The tests select `[data-editor-slot]`, `.app__broadcasts`, `.nav-item--list`, and `.bottom-nav__item`; all stay, so no rename sweep is needed.

## Decisions
- **[Decided]** The `#app` element stays the shell root, as `app app--scroll-main`; shell selectors are class based.
- **[Decided]** The add block moves into the action bar in both layouts, as ADR-0004 and the support.webapp todos demo place it.
  Wide layouts therefore show the add bar under the rows, not above them; `ui-design.md` changes with it.
  The add block keeps the `--width-main` column, centered in the bar.
- **[Decided]** The shell adds the action bar only while it holds content, and the banner slots hide while empty.
  Shell rules test `:has(> .app__action-bar)` and `:has(> :not([hidden]))`, so an empty area must leave the grid.
- **[Decided]** Views receive `actionBar` and `overlays` elements; without them they keep the old in-view placement.
- **[Decided]** Navigation keeps the app's own item components beside the shell classes, as the sidebar already does.
  Sidebar links are `app__nav-item nav-item`; bottom bar links are `app__nav-item bottom-nav__item`.
- **[Decided]** Shell parts take the shell look: the wide top bar keeps its surface and border, and the title its shell size.
- **[Decided]** The editor panel loses its wide card frame, since the side panel now frames it with a start border.
- **[Decided]** The `--width-main` view column stays as an app layout width; the main area's gutter replaces the view padding.
- **[Decided]** A skip link to the main area opens the shell; its click focuses `#main` without changing the route hash.
- **[Decided]** `style.css` imports `shell.css` after the look and before the app stylesheets, so the app components win ties.

## Size
Size estimate: 18 files, 700 lines

Size note: Above the typical line because the shell markup, its styles, and the tests that select it must move together to stay lossless.
Splitting leaves an unmergeable state: shell.css without the new markup misplaces every area.

## Declared Files
Counted files, changed by hand:
- src/css/style.css
- src/css/controls.css
- src/css/app-chrome.css
- src/css/views.css
- src/js/ui/layout.js
- src/js/app.js
- src/js/views/all-tasks.js
- src/js/views/list.js
- src/js/views/lists.js
- src/service-worker.js
- tests/unit/layout.test.js
- tests/unit/design-system.test.js
- tests/unit/tokens.test.js
- tests/unit/all-tasks.test.js
- tests/unit/lists.test.js
- tests/e2e/shell.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Uncounted: deleted `src/css/app-shell.css`; generated `scripts/sw-precache-hashes.json` from `node scripts/check-sw-version.mjs --update`.
Uncounted: the selector sweep in `tests/e2e/lists.spec.js`, `tests/e2e/list.spec.js`, and one line of `tests/e2e/shell.spec.js`.

Mechanical command: `sed -i -E "s/'\.lists-view \.fab'/'.app__overlays .fab'/g; s/page\.locator\('\.lists-view'\)\.getByRole\('link', \{ name: 'New list'/page.locator('.app__overlays').getByRole('link', { name: 'New list'/g; s/'\.list-view \.info-line__(text|reset)'/'.app__action-bar .info-line__\1'/g" tests/e2e/lists.spec.js tests/e2e/shell.spec.js tests/e2e/list.spec.js`

Measured: 18 counted files, all declared, plus 2 sweep-only test files and the generated hash manifest.

### Tests
- Unit: `tests/unit/layout.test.js` asserts the ADR-0004 areas, the skip link, the nav item classes, and the overlay layer.
- Unit: the same file asserts the action bar joins the shell only while it has content, and empty banner slots hide.
- Unit: `tests/unit/all-tasks.test.js` and `tests/unit/lists.test.js` assert the add block and the floating button mount into the given areas.
- Unit: `tests/unit/design-system.test.js` accepts no vendored check warnings.
- Integration: `tests/e2e/shell.spec.js` checks the action bar, side panel, and overlays at 390 and 1440 px.
- Integration: T0230's proof harness at 390 and 1440 px, light and dark, before and after, with every difference listed.

Completion check: `python scripts/devops.py check` and `node src/vendor/design/bin/check.mjs`, both exit code 0

## Visual Differences
Found by `proof/compare-shell.mjs` over 32 captures; each is a deliberate change of the shell move, or a fix.
- Deliberate: the add block sits in the action bar under the rows in both layouts, on the bar's surface with its top border.
  Wide layouts lose the 32 px gap above the rows; compact layouts lose the sticky page-ground strip.
- Deliberate: the add block and the view take the full `--width-main` (720 px) column; the view padding moved to the main gutter.
  At 1440 px the rows grow from 688 to 720 px; at 390 px the content keeps its 358 px.
- Deliberate: the compact editors open as a full-window sheet over the top and bottom bars, per ADR-0004.
- Deliberate: the wide editor panel fills the 400 px side panel column, framed by its start border; the card border, radius, and shadow go.
- Deliberate: the wide top bar takes the shell look: surface ground, bottom border, no 16 px top padding, and an 18 px title instead of 22 px.
- Deliberate: the wide sidebar brand loses its top bar alignment rule, so it is 18 px instead of 22 px and starts 12 px lower.
- Deliberate: the top bar gap grows from 4 to 8 px, the shell value.
- Deliberate: bottom bar items lose the 4 px gap between icon and label; the current item has no hover ground, the shell's current-item rule.
- Deliberate: the banner area sits above the main column, not inside it, padded by the gutter; it takes no room while empty.
- Deliberate: the toast region rises 4 px less on compact task views, as the shell offsets it by the action bar height token.
- Fix: the main column pads its end while the floating button shows, which the Lists view used to do itself; the button keeps its place.
- Added: a skip link, off screen until focused, and the empty overlay layer and action bar elements.
