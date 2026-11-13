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

## Probe at Decide Time
Measured on 2026-11-13 at `ceb160b` with the copied harness, which adds row menu, dialog, field error, and toast scenarios:
- `index.css` with every app stylesheet kept: 4740 changed values, 128 distinct kinds in `light-1440`.
- `index.css` without `controls.css`: 6644 changed values, 172 distinct kinds; most are font values inherited by icons.
- The visible kinds: menu and popover radius 12 to 8 px, segmented option radius 4 to 8 px, a transparent 1 px chip border,
  the danger color on the overdue chip, a 400 legend weight, the field grid, and a 440 px dialog.

## Decisions
- **[Decided]** `style.css` imports only `../vendor/design/looks/neutral/index.css`, then `tokens.css` and the app stylesheets.
  Its base rules that `reset.css` already holds go: box model, text size, body margin, `.visually-hidden`, and the focus ring.
- **[Decided]** `controls.css` goes. Its app-only rules move to `app-components.css`:
  `.choice` and `.choice-group`, `.filter-chip`, `.dialog--in-view`, `.banner--error`, and `.field__meta` if used.
- **[Decided]** The app keeps its documented overdue chip color, the signal color (`OVD-2`), as an app-local rule.
- **[Decided]** Other component values take the package look, each listed under Visual Differences.
- **[Decided]** App modules import the public vendored modules by relative path, such as `../../vendor/design/js/menu.js`.
  `ui/dialog.js`, `menu.js`, `popover.js`, `toast.js`, `live-region.js`, and `sw-update.js` go; so do their unit tests,
  since the package owns and tests those modules. App views keep their own tests, which now run the vendored code.
- **[Decided]** Menus and popovers become native `popover` panels, as the vendored `popover.js` makes them.
  The unit tests install support.webapp's popover shim for happy-dom, through a Vitest setup file.
- **[Decided]** `ui/user-menu.js` stays as the app glue of the account menu: it builds the `.account-menu` skeleton
  and calls `attachAccountMenu`. The panel becomes a `.menu`: name line, then status, Recycle bin, and Settings items.
  Items keep their icons and `data-nav`, so the shell still marks the current route. The face is the package avatar.
- **[Decided]** `createField` leaves `views/editor-panel.js`; editors import it from the vendored `field.js`.
  Hidden labels use `field__label--hidden`; error announcements use the package's shared live region.
- **[Decided]** `app.js` calls `setSpriteUrl('vendor/design/looks/neutral/icons.svg')`, since the vendored field and account menu draw icons.
  The look sprite holds the app sprite's glyphs under `icon-` ids; moving app icons to it is out of scope.
- **[Decided]** `app.js` uses `createToast`, not the deprecated `createToaster` alias.
- **[Decided]** Worker updates use the vendored `watchWorkerUpdates`. An update activated in another tab shows its Reload toast,
  so the app passes `messages.reload` and no `onUpdatedElsewhere`; a store version change keeps the banner notice.
  A failed registration rejects, and `app.js` logs it as before.
- **[Decided]** The gallery behaviors import the vendored modules; the gallery's user menu specimen shows the account menu.
- **[Decided]** `index.html` modulepreload lines and the service worker precache list the vendored modules and the look sprite.

## Declared Files
Counted files, changed by hand:
- src/css/style.css
- src/css/app-components.css
- src/css/app-chrome.css
- src/js/app.js
- src/js/ui/layout.js
- src/js/ui/user-menu.js
- src/js/ui/inbox.js
- src/js/views/sync-indicator.js
- src/js/views/editor-panel.js
- src/index.html
- src/service-worker.js
- src/demo/visual-style-gallery-behaviors.js
- src/demo/visual-style-gallery.html
- vitest.config.js
- tests/unit/design-system.test.js
- tests/unit/user-menu.test.js
- tests/unit/layout.test.js
- tests/unit/task-editor.test.js
- tests/e2e/shell.spec.js
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Uncounted: deleted `src/css/controls.css`, the six app modules, and their five unit tests; added `tests/unit/popover-shim.js` and `tests/unit/setup.js`.
Uncounted: generated `scripts/sw-precache-hashes.json` from `node scripts/check-sw-version.mjs --update`.
Uncounted: the import path sweep over the views and the `.user-button` and `.user-panel` selector sweep over the e2e specs.

### Tests
- Unit: `tests/unit/design-system.test.js` requires `style.css` to import `looks/neutral/index.css` and no other vendored file.
- Unit: the same file requires no app copy of a vendored module, no `controls.css`, and only public vendored imports in app code.
- Unit: `tests/unit/user-menu.test.js` asserts the account menu skeleton, its menu items, the avatar face, and session changes.
- Unit: `tests/unit/layout.test.js` asserts the account menu in the top bar and the current route mark on its items.
- Unit: `tests/unit/task-editor.test.js` asserts the editor fields come from the vendored `field.js` skeleton.
- Unit: the existing tests of every app module whose imports move, run against the vendored code.
- Integration: `tests/e2e/shell.spec.js` opens the account menu at 390 and 1440 px and follows its items.
- Integration: T0230's proof harness at 390 and 1440 px, light and dark, before and after, with every difference listed.

Completion check: `python scripts/devops.py check` and `node src/vendor/design/bin/check.mjs`, both exit code 0
