## Technical Specifications

### Declared Files
- src/js/views/list.js
- src/js/views/reorder.js
- src/js/views/task-list.js
- tests/unit/reorder.test.js
- tests/e2e/list.spec.js

Size estimate: 5 files, 400 lines

### Tests
- Unit: a drop or a keyboard move computes the right before or after neighbor.
- Integration: dragging a row stores the new order, which survives a reload.
- Integration: Alt+Down moves the focused row and keeps focus on it; a live region announces the move.
- Integration: a sorted view hides move controls and leaves the stored order unchanged.

Completion check: `npm test && npm run lint && npm run test:e2e`
