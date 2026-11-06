### Design
- **[Decided]** The user button is the last item of the top bar in both layouts; the wide layout's top bar already ends at the main column's right edge.
- **[Decided]** The popover is a non-modal `attachPopover` panel with links, so Recycle bin and Settings keep real `href` targets and `aria-current`.
- **[Decided]** Local mode: the button shows a person icon; its `title` and accessible name read "Local User"; the panel indication reads "Local only".
- **[Decided]** Connected: the button shows the initials of the account name, or of the email without a name; the panel indication reads "Connected".
- **[Decided]** "Connected mode, not signed in" is the session state `sign-in-needed`. A Sign in button sits left of the user button and opens `#/connect`, whose Sign in button starts Auth.
- **[Decided]** The user button stays in that state, with the panel indication "Session expired", so Recycle bin and Settings stay reachable.
- **[Decided]** The shell loses the sync indicator and the Recycle bin and Settings entries of the sidebar and bottom bar (bottom bar: Tasks, Lists). The `.sync-indicator` component stays for T0027.
- **[Decided]** The panel re-reads the session on open and on session changes. A token that expires while the app is open shows on the next open.
- **[Decided]** The gallery keeps its sidebar and bottom bar specimens, as generic navigation components, and gains a User button section.
- Unaffected: Connect remains reachable from Settings, the empty states, and the list editor.

### Declared Files
- src/js/ui/user-menu.js
- src/js/ui/layout.js
- src/js/ui/popover.js
- src/js/app.js
- src/img/icons.svg
- src/css/app-chrome.css
- src/css/app-shell.css
- src/service-worker.js
- src/demo/visual-style-gallery.html
- scripts/draw-wireframes.py
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md
- CHANGELOG.md
- tests/unit/user-menu.test.js
- tests/unit/layout.test.js
- tests/unit/menu.test.js
- tests/test_draw_wireframes.py
- tests/e2e/shell.spec.js
- tests/e2e/connect.spec.js
- tests/e2e/gallery-chrome.spec.js

Mechanical: `docs/img/ui/*.svg` (`python scripts/draw-wireframes.py`) and `scripts/sw-precache-hashes.json` (`node scripts/check-sw-version.mjs --update`).

Size estimate: 17 files, 650 lines
Size note: popover.js, menu.test.js, and test_draw_wireframes.py were added to the declared files during execution.
Size note: Above the typical line. The button, the panel, and the removal of the moved entries cannot merge apart; the docs and gallery follow the style system rules.

### Tests
- Unit: local state renders a person icon, title and name "Local User", indication "Local only", and links to #/bin and #/settings.
- Unit: connected state renders initials of the name ("Ada Lovelace" gives "AL"; an email alone gives its first letter), the name as title, and "Connected".
- Unit: sign-in-needed state renders a Sign in button linking to #/connect, and the indication "Session expired".
- Unit: the panel opens on click, closes on Escape, outside click, and link selection; a session change re-renders the button.
- Unit: the shell has no sync indicator, and its sidebar and bottom bar hold no Recycle bin or Settings entry.
- Integration: End-to-end on compact and wide layouts: the button shows at top right; click opens the panel; Recycle bin and Settings navigate and mark aria-current.
- Integration: End-to-end with a stored session: initials and name on hover, "Connected"; with an expired one, the Sign in button opens #/connect.

Completion check: `npm test`, `npm run lint`, `npx playwright test`, and `npm run check:sw`
