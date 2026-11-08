## Technical Specifications

Design source: docs/specs/ui-design.md, sections Sidebar With Many Lists and Lists Overview (Many Lists), written by T0056.

### Declared Files
- src/js/ui/layout.js
- src/css/app-shell.css
- src/css/app-components.css
- tests/unit/layout.test.js
- tests/e2e/shell.spec.js

Size estimate: 5 files, 220 lines
Completion check: `npm test` and `npx playwright test tests/e2e/shell.spec.js`

### Tests
- Unit: `setLists` called twice with changed counts keeps the same `<li>` elements, so focus and scroll survive.
- Unit: A count of 0 renders no visible text but keeps the exact number in the visually hidden text; 1000 renders "999+".
- Unit: A removed list drops its row; a new list adds its row at its place in the stored order.
- Integration: Playwright with 150 lists: only the list region scrolls; All tasks and Lists stay put; opening the 120th list scrolls it into view once, and a later count change leaves the scroll alone.

### Notes
- The scroll region has `overscroll-behavior: contain`; keyboard Tab order is unchanged until the roving task.
- Scroll into view uses `block: 'nearest'` and runs on route change only.
