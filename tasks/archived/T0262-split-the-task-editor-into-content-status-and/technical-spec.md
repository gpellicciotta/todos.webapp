## Technical Specifications

### Declared Files
- src/js/views/task-editor.js
- src/css/app-components.css
- tests/unit/task-editor.test.js
- tests/e2e/task-editor.spec.js
- src/demo/visual-style-gallery.html
- docs/specs/visual-style-guide.md
- docs/specs/ui-design.md

Size estimate: 7 files, 400 lines.

Files touched beyond the declared list, logged during execution:
- src/js/views/notes.js: the notes search the Content tab requires.
- src/css/views.css and src/css/app-chrome.css: they hold the editor and note thread styles, not app-components.css.
- src/service-worker.js and src/index.html: they precache and preload tabs.js, as the precache and preload tests require.
- src/js/views/task-history.js: its docblock now names the tab-driven load.
- src/demo/visual-style-gallery-behaviors.js: it makes the gallery tabs work.
- tests/e2e/all-tasks.spec.js and tests/e2e/list.spec.js: their editor status steps select the Status tab first.

Mechanical command: `node scripts/check-sw-version.mjs --update`.
Mechanical files: scripts/sw-precache-hashes.json

Size note: 15 counted files and 748 changed lines, above the typical line and below the large line.
The tabs, the moved sections, the notes search, and their tests merge only together.
Splitting them would ship an editor whose Content tab cannot search notes or whose tests fail.

### Design Source
- The Tabs section of T0257's brief governs; revise this spec if sign-off changed it.
- Brief: ../T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md.

### Tabs
- A tab list under the editor header: Content, Status, History, with the vendored tabs.js and tabs.css.
- Arrow keys move between tabs, Home and End jump, and the tab panel follows selection.
- Each open of the editor, also for another task, starts on Content.
- A field error on a hidden tab selects that tab and focuses the field.
- History loads on request when its tab first shows, as Show history does today.
- Escape closes the editor from any tab; a text field's change saves first, as today.

### Content Tab
- Only the description and the notes; the "Add or search notes" field also filters the thread to matching notes.

### Status Tab
- In order, with a horizontal rule between parts: the active status (T0258), Lists, then Target count, Due with Overdue behavior, and Repeat.
- Delete task sits at the bottom after a last rule, shown only to users who may delete (`SHR-5`).
- A deleted task, shown read-only with Restore (`BIN-6`), hides Delete task.
- Delete closes the editor with the Undo toast, as today.
- The tab strip and editor header get no More button.

### Tests
- Unit: the three tabs hold their sections, with Lists and Delete on Status; the editor opens on Content for each task.
- Unit: tab keys follow the WAI-ARIA tabs pattern; a field error selects its tab.
- Unit: Delete task shows only to users who may delete, and hides on a deleted task.
- Unit: the notes field filters the thread to matching notes.
- Integration: the task editor e2e spec edits a field on each tab at 1440 and 390 px, then deletes from the Status tab.

Completion check: `npm test` and `npx playwright test tests/e2e/task-editor.spec.js` pass.
