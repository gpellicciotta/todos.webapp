## Technical Specifications

Design source: docs/specs/ui-design.md, sections Sidebar With Many Lists and Lists Overview (Many Lists), written by T0056.

### Declared Files
- src/js/core/list-find.js
- src/js/core/list-sort.js
- src/js/core/list-counts.js
- src/js/ui/layout.js
- src/js/views/lists.js
- tests/unit/list-find.test.js
- tests/unit/list-sort.test.js
- tests/unit/list-counts.test.js

Size estimate: 8 files, 340 lines
Completion check: `npm test`

### Tests
- Unit: Find ignores case and accents, matches inside a word, and keeps the input order; an empty text returns every list.
- Unit: Find searches descriptions only when asked, and trims the text; 100 characters work.
- Unit: Sort by name uses `localeCompare` with base sensitivity, open count descends, and last activity is the newest task `last-activity-time` of the list.
- Unit: Sort ties fall back to the manual order; a list without tasks sorts last by activity.
- Unit: Counts give open, total, and last activity per list in one pass; deleted tasks are excluded.
- Unit: Counts over 500 lists and 5000 tasks finish in one pass: the test counts reads, not milliseconds.
- Integration: The existing layout and lists unit tests still pass, with the sidebar and the screen showing equal counts.

### Notes
- Helpers are pure: arrays in, arrays or maps out; no DOM, no store access.
- Accent folding uses `normalize('NFD')` and drops combining marks.
- The 1000-or-more count cap ("999+") belongs to the sidebar task, not here.
