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
- Class renames reach about 9 end-to-end specs and 6 unit tests; one sed command should make them, as a mechanical change.

## Size
**[Estimation]** About 17 counted files and 750 hand-written lines, plus a mechanical class rename across the tests.
The estimate counts the hand-edited modules, stylesheets, and tests above; a deleted `app-shell.css` is excluded.
It sits just under the large line of 18 files; the Decide step recounts it and requests size approval if it crosses.

Size estimate: 17 files, 750 lines

Size note: Above the typical line because the shell markup, its styles, and the tests that select it must move together to stay lossless.

## Declared Files
To be listed in the Decide step, at a recorded commit.

### Tests
- Unit: `tests/unit/layout.test.js` and `tests/unit/add-bar.test.js` assert the ADR-0004 areas and the action bar markup.
- Unit: `tests/unit/design-system.test.js` accepts no vendored check warnings.
- Integration: T0230's proof harness at 390 and 1440 px, light and dark, before and after, with every difference listed.

Completion check: `python scripts/devops.py check` and `node src/vendor/design/bin/check.mjs`, both exit code 0
