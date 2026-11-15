## Technical Specifications

### Declared Files
- src/js/store/notes.js
- src/js/sync/queue.js
- src/js/views/notes.js
- src/js/views/task-history.js
- src/js/views/task-editor.js
- tests/unit/store-notes.test.js
- tests/unit/queue.test.js
- tests/unit/task-editor.test.js
- tests/contract/sync.contract.test.js
- tests/e2e/task-editor.spec.js
- docs/requirements.md
- docs/specs/local-store.md
- docs/specs/ui-design.md

Size estimate: 13 files, 650 lines.
Size note: Above the typical line because the link spans the note store, the change queue, and two views; none merges alone.

### Requirements
Follow the todos.server [Notes and Occurrences](../../../../todos.server/docs/specs/business-logic-spec.md#notes-and-occurrences) rules.
- Store: `createNote` links a note on a recurring task to the occurrence whose period contains its `creation-time`.
  - Use the local period math from T0235; a time in no period keeps the note global.
  - A note on a one-off task stays global unless the caller passes an occurrence.
  - `updateNote` can change `occurrence` to any occurrence from 1 to the current one, or clear it to `null`.
- Queue: `create-note` and `update-note` entries send `occurrence` when set.
  - Undo of a rejected link change restores the previous link.
  - Adoption on first connect uploads each note's link.
- Task history (T0235's view): each occurrence lists its linked notes, newest first.
- Task editor: the notes section lists global notes, then the current occurrence's notes, each marked with its occurrence.
- Note editor: a choice between "Whole task" and an occurrence, offered for one-off and recurring tasks.
  - It lists occurrences newest first, labeled by period as the history labels them.
  - The control is keyboard operable and names the current link in text.
- A `409 Conflict` on a link past the current occurrence shows in the sync log like other rejections.

### Tests
- Unit: `createNote` links by period on recurring tasks, stays global on one-off tasks and outside every period.
- Unit: `updateNote` changes and clears the link, and refuses occurrences below 1 or past the current one.
- Unit: the queue sends `occurrence` on create and update, and undo restores the old link.
- Unit: the history lists notes under their occurrence, and the note editor offers the link choice.
- Integration: the contract suite posts a linked note and edits its link against a local todos.server.
- Integration: e2e adds a note to a daily task, sees it in the history, then makes it global.

Completion check: `npx vitest run`, `npm run test:contract` against a local todos.server, and `npx playwright test tests/e2e/task-editor.spec.js` pass.
