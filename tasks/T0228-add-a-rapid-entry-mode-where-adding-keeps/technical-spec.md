## Technical Specifications

### Declared Files
- src/js/views/add-bar.js
- src/js/views/all-tasks.js
- src/js/views/list.js
- src/js/core/preferences.js
- src/js/views/settings.js
- src/css/app-components.css
- src/demo/visual-style-gallery.html
- src/service-worker.js (cache version bump)
- scripts/draw-wireframes.py
- tests/unit/add-bar.test.js
- tests/unit/all-tasks.test.js
- tests/unit/list.test.js
- tests/unit/preferences.test.js
- tests/unit/settings.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/list.spec.js
- tests/e2e/bin-settings.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- docs/specs/visual-style-guide.md

Mechanical command: `python scripts/draw-wireframes.py docs/img/ui` regenerates `docs/img/ui/settings.svg`.
Mechanical command: `node scripts/check-sw-version.mjs --update` regenerates `scripts/sw-precache-hashes.json`.

### Decision
- The user chose, on 2026-11-15, Enter adding by default with a Make Enter add switch in Settings.
- Compact adds skip the editor; wide adds open it without taking the focus.

### Requirements
- Enter adds like the Add button while `todos.enter-adds` is not `false`; it is on by default.
- With the switch off, or for a viewer, or without a description, Enter applies the search and never adds.
- Shift+Enter and Alt+Enter always add.
- `aria-keyshortcuts` and the Add tooltip name Enter only while it adds; they refresh on focus.
- Every add keeps the focus in the add field.
- Wide screens (from 64rem) open the editor route; compact screens keep the route.
- The new row is highlighted for two seconds and scrolled into view; the polite live region says "Added “{{description}}”.".
- The hidden-task toast with Show still appears when the view options hide the new task.
- The Settings switch states the mode in text, works by keyboard, and turns back with a toast when it cannot be saved.

### Tests
- Unit: Enter adds by default, searches when the switch is off, for a viewer, or without a description.
- Unit: the choice survives a reload through preferences, and the Settings switch stores it.
- Unit: a compact add opens no editor, keeps the focus, highlights the row, and announces it.
- Integration: e2e at 390 px types five tasks with Enter and finds them in order without the editor.
- Integration: e2e turns the switch off in Settings and confirms Enter then only searches.

Completion check: `npm test` and the all-tasks and list e2e specs pass.
