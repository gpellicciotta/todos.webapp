## Technical Specifications

### Declared Files
- src/js/views/add-bar.js
- src/js/core/preferences.js
- src/js/views/settings.js
- tests/unit/add-bar.test.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/list.spec.js
- docs/requirements.md
- docs/specs/ui-design.md

### Requirements
- The current rules stay the default: Enter never adds, and an add opens the task editor (`VO-3`, `TSK-13`).
- In Rapid entry mode:
  - Enter adds, like the Add button, and clears the field.
  - Focus stays in the add field on every layout.
  - The editor does not open; the new row briefly highlights and a polite announcement names it.
  - "Add anyway" on an exact match still applies, so duplicates stay visible.
- The hidden-task toast with Show still appears when the view options hide the new task.
- The toggle states the mode in text, not only by icon, and works by keyboard.
- The Decide step needs the user's choice, because the current rules are marked Decided in ui-design.md.

### Tests
- Unit: Enter adds only in Rapid entry mode, and never opens the editor there.
- Unit: the mode survives a reload through preferences.
- Integration: e2e on a 390 px viewport turns the mode on, types five tasks with Enter, and finds them in order without the editor opening.

Completion check: `npm run test:unit` and the all-tasks and list e2e specs pass.
