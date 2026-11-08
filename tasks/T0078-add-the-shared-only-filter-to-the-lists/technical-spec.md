## Technical Specifications

Design source: docs/specs/ui-design.md, sections Sidebar With Many Lists and Lists Overview (Many Lists), written by T0056.

### Declared Files
- src/js/views/lists.js
- src/js/views/lists-find-bar.js
- tests/unit/lists.test.js
- tests/e2e/lists.spec.js

Size estimate: 4 files, 140 lines
Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js`

### Tests
- Unit: The checkbox is absent in local mode and with no shared list; present when connected with one.
- Unit: Shared only keeps shared lists, adds "Shared only" to the info line, and Reset clears it.
- Integration: Playwright with a connected fake service and two shared lists: toggling the checkbox shows only those two lists.

### Notes
- Needs the sharing state and the owner data that T0028 adds (`SHR-3`).
