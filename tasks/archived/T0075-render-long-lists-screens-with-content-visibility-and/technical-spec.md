## Technical Specifications

Design source: docs/specs/ui-design.md, sections Sidebar With Many Lists and Lists Overview (Many Lists), written by T0056.

### Declared Files
- src/js/views/lists.js
- src/js/views/list-actions.js
- src/css/views.css
- tests/unit/lists.test.js
- tests/e2e/lists.spec.js

Size estimate: 5 files, 240 lines
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

### Tests
- Unit: A rendered Lists screen holds no row menu until a More button opens one; the menu then keeps focus handling as before.
- Unit: Up, Down, Home, End, PageUp, and PageDown move the single tab stop between row links.
- Unit: Right moves to the row's More button and Left back; Tab leaves the list.
- Integration: Playwright with 300 lists: Back from a list restores the scroll position, Tab crosses the list in one step, and browser find sees a name far down.

### Notes
- Rows set `contain-intrinsic-size: auto 64px`; no JavaScript windowing is added.
- If the 500-list time passes twice the 150-list time, record a follow-up for windowing.
