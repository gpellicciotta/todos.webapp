## Technical Specifications

### Background
- T0067 opened the task editor after Add, and the editor's first render focuses its Description (`TSK-13`).
- The All tasks and list screens return `false` from `onAdd`, so the add bar skips refocusing its field.
- Adding several tasks in a row then needs a click or `n` before each new task.

### Behavior
- **[Decided]** The task editor still opens after an add (`TSK-13` stays); only the focus changes.
- **[Decided]** Wide layout (from 64rem): focus stays in "Search or add a task", also after a click on Add.
- **[Decided]** Compact layout (below 64rem): the editor takes focus, as today, since it covers the add field.
- **[Decided]** The add bar always refocuses its field after a successful add; the `false` return of `onAdd` goes.
- **[Decided]** The task editor skips its first focus when, at its first render, the add field has focus in the wide layout.
  - The add field is `[data-shortcut~="add"]`; the compact query is `(width < 64rem)`, as in `import-dialog.js`.
  - A task opened any other way, such as from a row, still focuses its Description.
- A failed add still opens nothing and keeps the text in the field.

### Declared Files
- src/js/views/task-editor.js
- src/js/views/add-bar.js
- src/js/views/all-tasks.js
- src/js/views/list.js
- tests/unit/task-editor.test.js
- tests/unit/add-bar.test.js
- tests/unit/all-tasks.test.js
- tests/unit/list.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/list.spec.js
- docs/specs/ui-design.md
- CHANGELOG.md

Mechanical command: node scripts/check-sw-version.mjs --update (after the VERSION bump in src/service-worker.js)

Size estimate: 12 files, 160 lines

Size note: 12 files, above the typical line; one focus rule spans the editor, the add bar, both screens, and their tests.
Splitting would leave an intermediate commit where focus goes nowhere sensible, so it stays one task.

### Tests
- Unit: task editor leaves focus in a focused add field in the wide layout, and takes it in the compact layout.
- Unit: task editor focuses Description when opened from a row link, as before.
- Unit: add bar refocuses its field after an add, even when `onAdd` moved focus elsewhere.
- Unit: All tasks and list screens open the new task's editor route and refocus the add field.
- Integration: Playwright, wide: Add twice by button and by Shift+Enter; the add field stays focused and the editor shows the newest task.
- Integration: Playwright, compact: after an add, the editor's Description has focus.

Completion check: npx vitest run && npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js && npx eslint . && npm run check:sw
