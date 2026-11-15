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

### Undeclared Files Touched
- src/js/store/db.js: the facade passes the new `editNote` changes object.
- src/js/sync/adopt.js: first-connect upload sends each note's link.
- src/js/sync/merge.js: pulled notes and conflicts keep a queued link.
- src/js/sync/push.js: note edits send their `edit-times` (review round 1).
- src/css/app-chrome.css and src/css/views.css: occurrence marks and history notes.
- src/service-worker.js: the precache VERSION bump the precache check requires.
- tests/unit/adopt.test.js, tests/unit/merge.test.js, tests/unit/push.test.js: sync coverage.

Mechanical command: node scripts/check-sw-version.mjs --update
The command rewrites scripts/sw-precache-hashes.json, which the size count excludes.

Size estimate: 13 files, 650 lines.
Measured size after review round 1: 23 files, 905 lines, above the large line.
Size note: The link spans the note store, sync, merge, adoption, and two views; no part merges alone.
Size note: Review round 1 added edit-time pushes, past-occurrence editing, and live history notes.
Size note: Human size approval for the measured size is still outstanding.

### Requirements
Follow the todos.server [Notes and Occurrences](../../../../todos.server/docs/specs/business-logic-spec.md#notes-and-occurrences) rules.
- Store: `addNote` links a note on a recurring task as the server's `defaultLink` does.
  - It takes the newest occurrence that began by the creation time, while its period still runs.
  - A one-off task, or a time in no period, keeps the note global unless the caller passes an occurrence.
  - `editNote` can change `occurrence` to any occurrence from 1 to the current one, or clear it to `null`.
- Queue: `create-note` and `edit-note` entries send `occurrence` when set.
  - Edits send `edit-times` in the request body.
  - Undo of a rejected link change restores the previous link.
  - Adoption on first connect uploads each note's link.
- Task history (T0235's view): each occurrence lists its linked notes, newest first.
  - An open history redraws its notes on note changes, without reading occurrences and events again.
- Task editor: the notes section lists global notes, then the current occurrence's, then earlier ones.
  - Each linked note shows its occurrence, and own notes keep Edit and Delete.
- Note editor: a choice between "Whole task" and occurrences 1 to the current one, newest first.
  - Labels match the history; while connected, earlier periods load from the server route.
  - The control is keyboard operable and names the current link in text.
- A `409 Conflict` on a link past the current occurrence shows in the sync log like other rejections.

### Tests
- Unit: `addNote` links by the newest started period, stays global on one-off tasks and outside every period.
- Unit: `editNote` changes and clears the link, and refuses occurrences below 1 or past the current one.
- Unit: the queue sends `occurrence` on create and update, push sends `edit-times`, and undo restores the link.
- Unit: the thread keeps past notes editable, the link choice lists 1 to current, and history notes update live.
- Integration: the contract suite posts a linked note, edits its link, and merges two devices' link edits.
- Integration: e2e adds a note to a daily task, sees it in the history, makes it global, and rolls over.

Completion check: `npx vitest run`, `npm run test:contract` against a local todos.server, and `npx playwright test tests/e2e/task-editor.spec.js` pass.
