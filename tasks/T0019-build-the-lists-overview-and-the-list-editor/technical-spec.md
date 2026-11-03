## Technical Specifications

### Declared Files
- src/js/views/lists.js
- src/js/views/list-editor.js
- tests/unit/list-editor.test.js
- tests/e2e/lists.spec.js

Size estimate: 4 files, 350 lines

### Tests
- Unit: a duplicate or empty name shows a field error and saves nothing.
- Integration: New list creates a list once a valid name is typed, and closing early creates nothing.
- Integration: the overview shows open and total counts that follow task changes.
- Integration: deleting a list keeps its tasks, which stay visible in All tasks.

Completion check: `npm test && npm run lint && npm run test:e2e`
