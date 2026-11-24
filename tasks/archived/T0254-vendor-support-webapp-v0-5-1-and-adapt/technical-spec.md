## Technical Specifications

### Source
- Vendor support.webapp tag `v0.5.1` (commit 08df4fe), released 2026-11-24.
- Run from the app root: `node {{support-webapp-v0.5.1}}/bin/cli.mjs vendor --look neutral --to src/vendor/design`.
- Export the checkout with `git -c core.autocrlf=false archive v0.5.1`, as [devops.md](../../../../docs/devops.md) prescribes.
- v0.5.0 normalizes CRLF to LF in text integrity hashes; relax the LF-only warning in devops.md accordingly.

### Package Changes That Reach the App
- v0.3.0 refreshed only the bright look; the app uses `neutral`, so nothing changes there.
- `style.css` now imports `page.css`, `view-header.css`, `inbox.css`, `entry-list.css`, and other new partials.
- `.view-header` collides: [app-components.css](../../../../src/css/app-components.css) defines a flex header with a More button.
  - The package draws a grid with `margin-block-end: var(--space-4)` and an optional muted summary line.
  - Keep the app's header layout; drop app rules the package now covers, and override the rest.
- `page.css` adds body text, heading, link, and code styles plus a `[hidden]` guard; check every screen for shifts.
- `shell.css` adds sidebar end lists, nav badges, brand logos, hidden top bar parts, and banner dismiss.
- The nav toggle now swaps its `<use>` fragment to the next step: `nav-collapse`, `nav-hide`, `nav-menu`, or `nav-close`.
  - The app sprite [icons.svg](../../../../src/img/icons.svg) has only `nav-menu`; add the three glyphs from the neutral look sprite.
- In the rail, `app-nav.js` shows each entry's clipped label through `attachLabelTooltips`.
  - Sidebar entries carry `title` in [layout.js](../../../../src/js/ui/layout.js) (lines 164 and 414).
  - Drop those `title` attributes where the package tooltip replaces them, so the rail shows one tooltip.
- `field.js` defers blur validation until pointer release; check the task editor and Settings forms.
- New icons (`icon-refresh`, admin screen glyphs, nav glyphs) arrive in the look sprite only.

### Out of Scope
- Adopting new modules (`theme-boot.js`, `file-download.js`, `notices.js`, `inbox.js`, `dom-builders.js`, the entry list).
  Follow-up tasks T0290 to T0295 adopt them after this task.
- `view-router.js` needs History API routes; the app keeps hash routes, since GitHub Pages has no route rewrites.

### Declared Files
- design.json
- docs/devops.md
- docs/specs/visual-style-guide.md
- src/css/app-components.css
- src/css/app-chrome.css
- src/img/icons.svg
- src/js/ui/layout.js
- src/service-worker.js
- tests/unit/design-system.test.js
- tests/unit/precache.test.js
- tests/e2e/shell.spec.js

Mechanical command: node {{support-webapp-v0.5.1}}/bin/cli.mjs vendor --look neutral --to src/vendor/design
Mechanical files: src/vendor/design/**, design.json
Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 11 files, 240 lines
Size note: 11 counted files exceed the typical 8; the vendored copy cannot merge alone.
The pin, precache, nav toggle, and shell tests break together with it, so they change in one task.

### Tests
- Unit: design-system.test.js pins 0.5.1 and requires the vendored partials the app loads.
- Unit: precache.test.js requires every new vendored partial and module in the service worker list.
- Integration: shell.spec.js checks the toggle glyph after each press: collapse, hide, then menu, and close in the drawer.
- Integration: shell.spec.js checks that a rail entry shows one label tooltip on hover and focus, without a native title.
- Integration: the existing view header, focus, and gallery specs pass unchanged, at 390 and 1440 px in both themes.

Completion check: python scripts/devops.py check
