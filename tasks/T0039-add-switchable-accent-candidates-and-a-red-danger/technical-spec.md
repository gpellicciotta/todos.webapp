## Technical Specifications

### Declared Files
- src/js/views/notes.js
- src/js/views/task-editor.js
- tests/unit/task-editor.test.js
- tests/e2e/task-editor.spec.js
- src/service-worker.js

Size estimate: 5 files, 400 lines

### Tests
- Unit: Escape in a note's edit field cancels only that edit and keeps the panel open.
- Unit: a typed new note survives closing and reopening the editor in the same session.
- Integration: a new note appears at the top; editing marks it "edited"; deleting asks in place first.

Completion check: `npm test && npm run lint && npm run test:e2e && npm run check:sw`
