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
- **[Decided]** The app's own `createField` leaves `views/editor-panel.js`; editors build fields with the vendored `field.js`.
  Hidden labels use `field__label--hidden`; error announcements use the package's shared live region.
- **[Decided]** at Implement time: `editor-panel.js` exports `createEditorField`, a 15-line wrapper of the vendored `createField`.
  The vendored field re-validates on blur and edit and would clear the editors' own errors, set on change and on save.
  The wrapper passes `validate: () => error`, so a blur keeps the editor's error; native constraints still apply first.
  Sharing names its email message for `typeMismatch`, so an invalid address shows the app text, now also on blur.
- **[Decided]** `app.js` calls `setSpriteUrl('vendor/design/looks/neutral/icons.svg')`, since the vendored field and account menu draw icons.
  The look sprite holds the app sprite's glyphs under `icon-` ids; moving app icons to it is out of scope.
- **[Decided]** `app.js` uses `createToast`, not the deprecated `createToaster` alias.
- **[Decided]** Worker updates use the vendored `watchWorkerUpdates`. An update activated in another tab shows its Reload toast,
  so the app passes `messages.reload` and no `onUpdatedElsewhere`; a store version change keeps the banner notice.
  A failed registration rejects, and `app.js` logs it as before.
- **[Decided]** The gallery behaviors import the vendored modules; the gallery's user menu specimen shows the account menu.
- **[Decided]** `index.html` modulepreload lines and the service worker precache list the vendored modules and the look sprite.
  `precache.test.js` and `modulepreload.test.js` now follow module imports into the package, so the lists stay complete.
- **[Decided]** at Implement time: the task row menus attach on the first click, so that click calls `preventDefault`.
  The vendored popover makes the button its invoker during the click, and the default invoker toggle would close it again.
- **[Decided]** at Implement time: the shell's live region announcer passes no parent, since the package shares one region pair per page.
  Unit tests that reset the body keep that pair through `tests/unit/dom-reset.js`.
- **[Decided]** at Implement time: the task editor's in-flow combo-box list keeps `--layer-popover`, which the app's `.menu` rule gave it.
- **[Decided]** at Implement time: the account menu keeps a `--space-4` gutter to the window edges, as the user panel had.

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

Undeclared, logged at Implement time: `src/css/views.css`, `src/js/views/task-list.js`, `tests/unit/precache.test.js`,
`tests/unit/modulepreload.test.js`, `tests/unit/tokens.test.js`, `tests/unit/task-list.test.js`, `tests/e2e/gallery-chrome.spec.js`,
`tests/e2e/service-worker.spec.js`, `tests/e2e/gallery-app.spec.js`, and `docs/devops.md`.

Uncounted: deleted `src/css/controls.css`, the six app modules, and their five unit tests;
added `tests/unit/popover-shim.js`, `tests/unit/setup.js`, and `tests/unit/dom-reset.js`.
Uncounted: generated `scripts/sw-precache-hashes.json` from `node scripts/check-sw-version.mjs --update`.
Uncounted: the import path sweep over the views and the `.user-button` and `.user-panel` selector sweep over the e2e specs.

Mechanical command: `sed -i -E "s#from '\.\./ui/(dialog|menu|live-region)\.js'#from '../../vendor/design/js/\1.js'#" src/js/views/*.js`
Mechanical command: `sed -i -E "s/\bcreateField\b/createEditorField/g" src/js/views/list-editor.js src/js/views/notes.js src/js/views/sharing.js src/js/views/task-editor.js`
Mechanical command: `sed -i -E "s/(panel|\.user-panel'\))\.getByRole\('link'/\1.getByRole('menuitem'/g; s/\.user-button/.account-menu__button/g; s/\.user-panel/.account-menu__panel/g" tests/e2e/shell.spec.js tests/e2e/connect.spec.js`

Measured with `git diff --numstat --diff-filter=M ceb160b`, without `CHANGELOG.md` and the generated hash manifest:
41 modified files and 1320 changed lines, of which about 10 files and 50 lines are the mechanical sweeps above.
`app-components.css` counts 176 lines, mostly rules moved out of the deleted `controls.css`.
Size note: about 31 counted files and 1270 hand-written lines, above the approved 20 files and 1100 lines.
The overrun comes from the undeclared test and precache files that the vendored modules required; it is recorded, not self-approved.

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

## Visual Differences
Found by `proof/compare.mjs` over 52 captures: 13 screens at 390 and 1440 px, light and dark, 9704 changed values, 215 distinct kinds.
The harness adds four component scenes to T0230's: row menu, dialog, field error, and toast; and the account menu opened on Settings.
No capture logged a console error, page error, failed request, or HTTP error.
- Invisible: icons and icon buttons inherit the body font, as the package reset sets `font: inherit`; icons draw no text.
- Invisible: the shared live regions moved from the shell and view roots into the body, so their element paths changed.
- Invisible: the package field is a grid; labels, controls, and errors take grid areas, and each field gains a hidden status line.
- Deliberate: menus and popovers open as native popovers in the top layer, so position, inset, margin, and z-index read differently.
  Their anchored place on screen stays the same in every capture.
- Deliberate: menus, popovers, and the inbox and sync panels take the package's 8 px card radius instead of 12 px.
- Deliberate: segmented options and some icon buttons take 8 px corners instead of 4 px.
- Deliberate: chips gain a transparent 1 px border, for forced colors mode, so each chip is 2 px wider and the removable chip 2 px taller.
- Deliberate: segmented legends lose their medium weight and 4 px bottom margin, so the status and overdue sections are 4 px shorter.
- Deliberate: the add bar counter and field labels lose up to 12 px of width to the field grid's column gap; controls keep their width.
- Deliberate: the dialog is 440 px wide instead of 448 px, the package width.
- Deliberate: the user menu is the package account menu: an avatar face without the strong border, and a `.menu` panel.
  The name line carries the rule; status, Recycle bin, and Settings are menu items; the current item is semibold on the selected ground.
- Deliberate: an update activated in another tab shows the package's lasting Reload toast instead of the banner notice.
- Fix: the account menu keeps its gutter to the window edges, which the bare package menu lacks at 320 px.
- Kept: the overdue chip keeps the signal color (`OVD-2`), where the package uses the danger color.
