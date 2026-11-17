## Technical Specifications

Design source: docs/specs/ui-design.md, sections Sidebar With Many Lists and Lists Overview (Many Lists), written by T0056.

### Declared Files
- src/js/core/list-order.js
- src/js/views/lists.js
- src/js/views/list-actions.js
- src/js/ui/layout.js
- tests/unit/list-order.test.js
- tests/unit/lists.test.js
- tests/e2e/lists.spec.js
- src/js/views/settings.js (added during execution: the About shortcut step)
- tests/unit/settings.test.js (added during execution: the About shortcut step)
- tests/unit/layout.test.js (added during execution: the sidebar keys)
- src/js/views/reorder.js (added during execution: a stale module comment)
- src/service-worker.js (added during execution: the required precache `VERSION` bump)
- docs/specs/ui-design.md (added during execution: the Doc step)

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 7 files, 220 lines
Size note: 13 counted files and 330 lines; the extra files are small edits the task steps require, which cannot merge apart.
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

### Tests
- Unit: Move to top and Move to bottom produce the first and last position and the message "Garden moved to position 1 of 124.".
- Unit: The entries are absent while a sort or find text is active, and on the List screen menu.
- Unit: Alt+Home and Alt+End move a focused row or sidebar link to an end without opening a menu.
- Integration: Playwright with 124 lists: Move to bottom on the first list moves it last, scrolls it into view, and the sidebar shows the same order after a reload.

### Notes
- The stored order stays device-only in `todos.lists.order`; nothing syncs.
- reorder.js gains an optional `jump(id, end)` callback; whichever of T0263 and this task lands first adds it.
