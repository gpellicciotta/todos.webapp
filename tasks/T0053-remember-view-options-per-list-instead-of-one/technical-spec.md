### Declared Files
- src/js/core/preferences.js
- src/js/views/view-controls.js
- src/js/views/list.js
- tests/unit/view-controls.test.js
- tests/unit/list.test.js
- docs/specs/ui-design.md
- CHANGELOG.md

### Tests
- Unit: the list view model keeps a separate state per list under `todos.view.list.{{list-id}}`, restores it on select, and Reset removes the entry so the list follows the defaults again.
- Integration: two list screens mounted on one model and storage keep their own options; the text search of one never leaks into the other.

### Decisions
- **[Decided]** Entry per list: `todos.view.list.{{list-id}}`; a list without an entry shows the built-in list defaults (the shared defaults).
- **[Decided]** Reset removes the entry of the list; the old shared `todos.view.list` entry is no longer read.
- **[Decided]** All tasks keeps its single entry `todos.view.tasks`.

Size estimate: 7 files, 150 lines
Completion check: npm test && npm run lint
