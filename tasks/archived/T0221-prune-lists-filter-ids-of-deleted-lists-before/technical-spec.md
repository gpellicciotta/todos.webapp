## Technical Specifications

### Declared Files
- src/js/views/all-tasks.js
- src/js/views/add-bar.js
- tests/unit/add-bar.test.js
- tests/e2e/all-tasks.spec.js

### Tests
- Unit: `notifyIfHidden` with a Lists filter of a deleted list shows no toast.
- Integration: e2e filters by a list, deletes it, adds a task in All tasks, and sees no empty-named toast.

Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js` pass.
Size estimate: 4 files, 60 lines.
