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

Size estimate: 7 files, 220 lines
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

### Tests
- Unit: Move to top and Move to bottom produce the first and last position and the message "Garden moved to position 1 of 124.".
- Unit: The entries are absent while a sort or find text is active, and on the List screen menu.
- Unit: Alt+Shift+Up and Alt+Shift+Down move a focused row or sidebar link to an end without opening a menu.
- Integration: Playwright with 124 lists: Move to bottom on the first list moves it last, scrolls it into view, and the sidebar shows the same order after a reload.

### Notes
- The stored order stays device-only in `todos.lists.order`; nothing syncs.
