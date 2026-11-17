## Technical Specifications

Design source: docs/specs/ui-design.md, sections Sidebar With Many Lists and Lists Overview (Many Lists), written by T0056.

### Declared Files
- src/js/ui/layout.js
- src/js/ui/sidebar-find.js
- src/js/app.js
- src/css/app-shell.css
- tests/unit/sidebar-find.test.js
- tests/unit/layout.test.js
- tests/e2e/shell.spec.js

Size estimate: 7 files, 330 lines
Completion check: `npm test` and `npx playwright test tests/e2e/shell.spec.js`

### Tests
- Unit: The field is absent with 11 lists, present with 12, and stays while it holds text if lists drop below 12.
- Unit: Typing filters rows by name after 150 ms and sets the end counter to "4 of 124"; no match shows "No list matches.".
- Unit: Enter opens the first match and clears the field; Escape clears it; Down moves focus into the first row.
- Unit: Home, End, PageUp, PageDown, Up, and Down move the one tab stop between rows.
- Unit: `l` focuses the field, or routes to `#/lists` when the field is absent or the layout is compact.
- Integration: Playwright with 124 lists: type "ga", see 4 rows and the announcement, press Enter, land on the first list with the field empty and the row in view; Tab leaves the list in one step.

### Notes
- Uses the shared `list-find.js`; the sidebar matches names only.
- Keep the existing Alt+Up and Alt+Down moves; the Alt+Shift moves come with their own task.
