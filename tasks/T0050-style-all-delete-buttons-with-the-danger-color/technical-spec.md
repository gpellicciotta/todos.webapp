### Decisions
- **[Decided]** Secondary Delete buttons keep the danger outline (`button--secondary button--danger`).
- **[Decided]** Primary confirm buttons, such as Delete in dialogs, use a new filled danger variant with on-danger text.
- **[Decided]** Delete menu items use danger text and icon; hover and focus keep the danger focus ring.
- Controls to cover: list editor, task editor, list menu, task More menu, notes, confirm dialog, in-place confirm, recycle bin.

### Declared Files
- src/css/controls.css
- src/css/tokens.css
- src/js/views/list-editor.js
- src/js/views/task-editor.js
- src/js/views/list.js
- src/js/views/task-list.js
- src/js/views/notes.js
- src/js/views/recycle-bin.js
- src/demo/visual-style-gallery.html
- docs/specs/visual-style-guide.md
- tests/unit/tokens.test.js
- tests/e2e/gallery-danger.spec.js
- CHANGELOG.md

Size estimate: 13 files, 220 lines
Size note: One visual rule applies to every Delete control; the variants and their uses must ship together to stay consistent.

### Tests
- Unit: tokens define an on-danger color with at least 4.5:1 contrast on the danger fill in both themes.
- Unit: each view module marks its Delete control with the danger class or variant.
- Integration: Playwright opens each Delete control and checks its computed color against `--color-danger` in light and dark.
- Integration: the gallery spec confirms the new variants render and draw the danger focus ring.

Completion check: npm test && npx playwright test tests/e2e/gallery-danger.spec.js tests/e2e/gallery-controls.spec.js
