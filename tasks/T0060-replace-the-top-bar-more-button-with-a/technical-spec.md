### Design
- **[Decided]** The shell loses the top-bar More button and its menu; `attachMenu` stays for the view menus.
- **[Decided]** New list stays in the sidebar on wide layouts, and in the editor's Add to list box.
- **[Decided]** The `.fab` component holds the look: a pill button with icon and label, at `--elevation-2`.
- **[Decided]** The shell positions it fixed at the bottom end of the screen (app-shell.css), above the bottom bar when compact.
- **[Decided]** A new layer token sits between sticky bars and popovers, so the button covers rows but not popovers or dialogs.
- **[Decided]** The Lists view hides the button while an editor route is open, so it never covers the editor panel.
- **[Decided]** The Lists view keeps its rows clear of the button with bottom padding.

### Declared Files
- src/js/ui/layout.js
- src/js/views/lists.js
- src/css/tokens.css
- src/css/app-chrome.css
- src/css/app-shell.css
- src/css/views.css
- src/service-worker.js
- src/demo/visual-style-gallery.html
- scripts/draw-wireframes.py
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- CHANGELOG.md
- tests/unit/layout.test.js
- tests/unit/lists.test.js
- tests/e2e/shell.spec.js
- tests/e2e/lists.spec.js
- tests/e2e/gallery-chrome.spec.js
- tests/test_draw_wireframes.py

Mechanical: `docs/img/ui/*.svg` (`python scripts/draw-wireframes.py docs/img/ui`) and `scripts/sw-precache-hashes.json` (`node scripts/check-sw-version.mjs --update`).

Size estimate: 18 files, 450 lines
Size note: Above the typical line. Removing More and adding the floating button are one change of where New list lives.

### Tests
- Unit: the shell holds no More button or menu in the top bar.
- Unit: the Lists view renders a New list link to #/lists/new as a floating button, and hides it while an editor route is open.
- Integration: End-to-end on both layouts: the button is fixed at the bottom right, above the bottom bar when compact, and opens the New list editor.
- Integration: End-to-end with 40 lists: the button stays put while the rows scroll, and the last row can scroll clear of it.

Completion check: `npm test`, `npm run lint`, `npx playwright test`, `python -m pytest`, and `npm run check:sw`
