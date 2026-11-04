## Technical Specifications

### Declared Files
- src/js/views/all-tasks.js
- src/css/views.css
- src/css/style.css
- src/js/app.js
- src/service-worker.js
- tests/e2e/all-tasks.spec.js
- tests/e2e/shell.spec.js
- tests/unit/tokens.test.js
- docs/specs/ui-design.md

Mechanical command: `node scripts/check-sw-version.mjs --update` (regenerates scripts/sw-precache-hashes.json)

Size estimate: 6 files, 550 lines
Size note: split on 2026-11-04 after reaching about 2580 lines; about 710 lines stay here.

### Tests
- Unit: filter and sort state round-trips through the per-device settings (`TV-12`).
- Integration: a first visit shows the empty state without any sign-in prompt.
- Integration: adding a task with Enter keeps focus in the add bar and shows the new row.
- Integration: the status menu changes a task's status by mouse and by keyboard.
- Integration: filters, search, and sort change the rows as specified, at 390 and 1440 px.

Completion check: `npm test && npm run lint && npm run test:e2e`

### Follow-Ups Moved Out
- The review follow-ups moved to T0035, the rows and add bar to T0036, and the controls to T0037.
