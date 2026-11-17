## Technical Specifications

Design source: docs/specs/ui-design.md, sections Sidebar With Many Lists and Lists Overview (Many Lists), written by T0056.

### Declared Files
- src/js/views/lists.js
- src/js/views/lists-find-bar.js
- src/js/core/preferences.js
- src/css/views.css
- tests/unit/lists.test.js
- tests/unit/lists-find-bar.test.js
- tests/e2e/lists.spec.js

Size estimate: 7 files, 380 lines
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

### Tests
- Unit: The bar is absent with 11 lists and present with 12; the info line reads "124 lists" or "4 of 124 lists · Sorted by Name".
- Unit: Each sort choice orders the rows and persists in `todos.view.lists`; blocked storage falls back to Manual order.
- Unit: Reset clears the text and the sort; handles and Alt+arrows are inert while either differs, with the announcement.
- Unit: Enter opens the first match; Escape clears; `/` focuses the field through `data-shortcut="search"`.
- Unit: No match shows Create list "Garden shed" only for a valid, unused name; it creates the list and routes to its editor.
- Integration: Playwright with 124 lists at 390 px and 1440 px: the bar is pinned above the bottom bar when compact; finding "Garden shed" shows the offer; Create list opens the new list's editor.

### Notes
- Compact layout shows the sort button as an icon; the floating plus sits above the pinned bar.
- Search text lasts for the session and survives Back from a list, with the scroll position.
