### Declared Files
- src/js/views/add-bar.js
- src/js/views/all-tasks.js
- src/js/views/list.js
- src/js/core/query.js
- src/css/app-components.css
- tests/unit/add-bar.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/list.spec.js

Size estimate: 8 files, 350 lines

### Tests
- Unit: typed text filters description and notes on top of the view options; Enter never adds.
- Unit: the exact-match check ignores case and surrounding spaces, and Add anyway still adds.
- Integration: End-to-end: type "paint", see matches and the count, press Add, see the new task and a cleared field.
- Integration: Adding a task hidden by the view options shows a toast whose Show resets those options.

Completion check: `npm test` and `npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js`

### Design
See [ui-design.md](../../../docs/specs/ui-design.md), section Search and Add.
