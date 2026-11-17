## Technical Specifications

### Declared Files
- tests/e2e/bin-settings.spec.js
- tests/e2e/behaviors-dialog.spec.js

Size estimate: 2 files, 10 lines.

### Tests
- Unit test: none (the fix changes e2e expectations only).
- Integration: the Keyboard shortcuts test expects the Alt+Home or Alt+End row, at wide and compact widths.
- Integration: the gallery toast test reads the live region of the toast demo only.

Completion check: `npx playwright test tests/e2e/bin-settings.spec.js tests/e2e/behaviors-dialog.spec.js` passes.
