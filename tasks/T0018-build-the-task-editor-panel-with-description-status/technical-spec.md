## Technical Specifications

### Declared Files
- src/js/views/editor-panel.js
- src/js/views/task-editor.js
- src/js/views/notes.js
- tests/unit/task-editor.test.js
- tests/e2e/task-editor.spec.js

Size estimate: 5 files, 500 lines
Size note: the editor and its notes thread form one screen.

### Tests
- Unit: an invalid description or due time shows a field error and saves nothing.
- Integration: editing each field saves it without a Save button, and the change survives a reload.
- Integration: the Add to list box adds the task to an existing list or a new one.
- Integration: a new note appears at the top; editing marks it "edited".
- Integration: Delete task moves it to the recycle bin and shows an Undo toast.

Completion check: `npm test && npm run lint && npm run test:e2e`
