### Decisions
- **[Decided]** Only the sidebar Lists group gets the (+) icon button. The Lists screen button and the More menu entry stay.
- **[Decided]** The button uses the existing `icon-button` style, a tooltip, and `aria-label="New list"`.
- The touch target stays at least 44 px even though the glyph is small.

### Declared Files
- src/js/ui/layout.js
- src/css/app-chrome.css
- tests/unit/layout.test.js
- tests/e2e/lists.spec.js
- tests/e2e/shell.spec.js
- CHANGELOG.md

Size estimate: 6 files, 100 lines

### Tests
- Unit: the shell renders a Lists header whose sibling icon button is named New list and links to `#/lists/new`.
- Unit: no text "New list" button remains in the sidebar.
- Integration: Playwright clicks the (+) button in the sidebar and sees the new-list editor.
- Integration: Tab reaches the button and Enter opens the editor; the touch target measures at least 44 px.

Completion check: npm test && npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js
