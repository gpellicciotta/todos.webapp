# T0230 Technical Specification
Vendor the support.webapp design system with the neutral look and apply its token renames, losslessly.

---

## Baseline
- App read at todos.webapp `0cf4981` on 2026-11-13.
- Design system: support.webapp tag `v0.1.0` (`30e1f96`), exported with `git archive v0.1.0`.
- `vendor` runs from that export, as ADR-0005 allows for a checkout at a release tag; no registry token is needed.

## Decisions
- **[Decided]** Vendor into `src/vendor/design`, with `design.json` at the app root and `styles: ["src/css"]`.
- **[Decided]** The app takes its tokens from the vendored copy in this task, not from its own `tokens.css`.
  The vendored check fails otherwise: `tokens.css` redefines the neutral look's private primitives, such as `--gray-0`.
- **[Decided]** `style.css` imports `css/base.css` and the neutral `primitives.css`, `fonts.css`, and `look.css` directly.
  These are private files under ADR-0005; the public `looks/neutral/index.css` also loads every component and `shell.css`.
  A trial with `index.css` changed 6090 computed values over 32 captures, mostly component rules.
  Replacing the app's components is T0231's scope, so T0231 switches the import to `index.css` and removes this exception.
- **[Decided]** `tokens.css` keeps only app-local tokens: row and header heights, chip and segment widths, and the textarea height.
- **[Decided]** `src/css/fonts.css` and `src/fonts/` go: the vendored `fonts.css` loads a byte-identical `InterVariable.woff2`.
- **[Decided]** `.gitattributes` marks `src/vendor/**` as `-text`, so Windows checkouts keep the bytes that `check.mjs` hashes.
- **[Decided]** ESLint ignores `src/vendor/`; the package follows its own lint rules.
- **[Decided]** The precache test follows `@import` and `url()` from `style.css` to find the vendored files the app loads.

## Renames
Mechanical command, run from the repository root:

```bash
sed -i -E -e 's/--color-signal\b/--color-primary/g; s/--color-on-signal\b/--color-on-primary/g; s/--color-hover-bg\b/--color-surface-hover/g; s/--color-active-bg\b/--color-surface-active/g; s/--color-selected-bg\b/--color-surface-selected/g; s/--space-8\b/--space-9/g; s/--width-editor\b/--width-side-panel/g; s/--icon-size-lg\b/--icon-lg/g; s/--icon-size\b/--icon-md/g; s/--radius-sm\b/--radius-chip/g; s/--radius-lg\b/--radius-dialog/g' src/css/*.css src/demo/*.css src/demo/*.html src/demo/*.js docs/specs/visual-style-guide.md
```

- `--radius-sm` maps to `--radius-chip` and `--radius-lg` to `--radius-dialog`, the only neutral roles with those values.
- Each `--radius-md` use moves by hand to `--radius-control`, `--radius-button`, or `--radius-card`; all three equal `--radius-md`.
- Afterwards a search for every old name must find nothing outside `CHANGELOG.md`, `.plan/`, and `src/vendor/`.

## Declared Files
Counted files, changed by hand:
- src/css/style.css
- src/css/tokens.css
- src/css/controls.css
- src/css/app-components.css
- src/css/app-chrome.css
- src/css/views.css
- src/demo/visual-style-gallery.css
- src/demo/visual-style-gallery.html
- src/service-worker.js
- tests/unit/tokens.test.js
- tests/unit/precache.test.js
- tests/e2e/gallery.spec.js
- eslint.config.js
- scripts/devops.py
- .github/workflows/pages.yml
- docs/specs/visual-style-guide.md
- docs/devops.md (added during execution: the vendored check and update procedure)

Uncounted: added `.gitattributes`, `design.json`, `src/vendor/design/**`, and `tests/unit/design-system.test.js`.
Uncounted: deleted `src/css/fonts.css` and `src/fonts/`; generated `scripts/sw-precache-hashes.json`; the sed sweep.

Size estimate: 16 files, 380 lines
Measured: 17 counted files; about 490 hand-written lines, after removing the sweep's 434 lines from 922 changed lines.

Size note: Above the typical line because one rename concern touches every stylesheet, plus the service worker and CI wiring.
Splitting it leaves an unmergeable state: the vendored check fails until the app stops defining the look's primitives.

### Tests
- Unit: `tests/unit/design-system.test.js` fails on any renamed token name, or a neutral primitive, in app CSS, HTML, or JavaScript.
- Unit: the same file checks `design.json` pins 0.1.0 and neutral, and that the vendored `check()` reports no errors.
- Unit: `tests/unit/tokens.test.js` runs its contrast pairs on the vendored look under the new names.
- Unit: `tests/unit/precache.test.js` requires every vendored file that `style.css` loads, and no other vendored file.
- Integration: the proof harness in `proof/` captures 8 pages at 390 and 1440 px, light and dark, before and after.
  `proof/compare.mjs` must report zero computed-style differences, apart from listed deliberate changes.

Completion check: `python scripts/devops.py check` and `node src/vendor/design/bin/check.mjs`, both exit code 0
