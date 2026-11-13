# T0233 Technical Specification
Replace the app's shared components with the vendored ones and import the public neutral look entry point.

---

## Starting Point
- T0231 has moved the layout onto `shell.css`; T0230 vendored support.webapp 0.1.0 and moved every token to it.
- `style.css` still imports private vendored files: four token files and `shell.css`.
  This task replaces them with the public `looks/neutral/index.css`, as ADR-0005 requires.
- A T0230 trial with `index.css` over the app's own styles changed 6090 computed values over 32 captures.
  Most came from component rules: icon fonts, chip borders, field grids, and banner padding.

## Scope Found at Read Time
Read on 2026-11-13 at `56e799b`:
- App modules with vendored counterparts, and their exports:
  - `ui/dialog.js` (`openDialog`, `confirmDialog`) and `ui/menu.js` (`attachMenu`): same exports in the package.
  - `ui/popover.js` (`tabbableIn`, `anchorPanel`, `attachPopover`): split into `focus.js`, `anchor.js`, and `popover.js`.
  - `ui/toast.js` (`createToaster`): `createToast`, with `createToaster` kept as a deprecated alias.
  - `ui/live-region.js` and `ui/sw-update.js`: same exports.
  - `ui/user-menu.js` (`attachUserMenu`): `attachAccountMenu` in `account-menu.js`, with `.account-menu__button`.
  - `createField` in `views/editor-panel.js`: `createField` and `attachField` in `field.js`.
- Importers: about 16 view and UI modules; tests: about 8 unit tests and the specs that select `.user-button`.
- `controls.css` should go almost entirely; `app-chrome.css` and `app-components.css` keep only app-local parts.
- `index.html` modulepreload lines and the service worker precache change with every moved module.

## Size
**[Estimation]** About 20 counted files and 1100 hand-written lines; import path changes can be one mechanical command.
The estimate counts the importers whose API use changes, the remaining stylesheets, and the tests above.
That is above the large line, so the task needs human size approval before it starts, or a further split by component.

Size estimate: 20 files, 1100 lines

Size note: Not split further, because the vendored modules emit the package markup that only the package CSS styles.
Swapping modules without `index.css`, or `index.css` without the modules, leaves an unmergeable, visibly broken state.

## Declared Files
To be listed in the Decide step, at a recorded commit.

### Tests
- Unit: tests of every app module whose imports move to the vendored components.
- Unit: `tests/unit/design-system.test.js` requires `style.css` to import `looks/neutral/index.css` and no private file.
- Integration: T0230's proof harness at 390 and 1440 px, light and dark, before and after, with every difference listed.

Completion check: `python scripts/devops.py check` and `node src/vendor/design/bin/check.mjs`, both exit code 0
