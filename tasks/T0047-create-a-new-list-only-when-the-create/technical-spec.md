### Decisions
- **[Decided]** New mode gets a Create button; edit mode keeps saving on change with no button.
- **[Decided]** Create stays disabled while the name is empty or a duplicate; the field error shows as today (`LST-3`).
- **[Decided]** Enter in the name field acts as Create. Escape and the x button discard the draft silently.

### Declared Files
- src/js/views/list-editor.js
- tests/unit/list-editor.test.js
- tests/e2e/lists.spec.js
- docs/requirements.md
- CHANGELOG.md

Size estimate: 5 files, 120 lines

### Tests
- Unit: mounting on `#/lists/new` and typing a valid name creates no list until Create is clicked.
- Unit: closing the panel with a valid name typed leaves the store without a new list.
- Unit: Create is disabled for an empty name and for a case-insensitive duplicate.
- Unit: edit mode still saves name and description on change.
- Integration: Playwright opens New list, types a name, clicks x, and finds no new list; then repeats and clicks Create.

Completion check: npm test && npx playwright test tests/e2e/lists.spec.js
