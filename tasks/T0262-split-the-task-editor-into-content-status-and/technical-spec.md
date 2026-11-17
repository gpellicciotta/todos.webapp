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
