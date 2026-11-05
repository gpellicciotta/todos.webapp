## Technical Specifications

### Declared Files
- src/js/views/settings.js
- src/js/views/import-dialog.js
- tests/e2e/backup.spec.js

Size estimate: 3 files, 250 lines

### Tests
- Unit test: none (the dialog only wires the tested backup module to the UI; end-to-end tests cover it).
- Integration: Export backup downloads `todos-backup-` plus the export date and `.json`, holding the stored data.
- Integration: importing that file in Merge mode shows the expected counts and changes nothing on Cancel.
- Integration: an invalid file shows its reason and leaves the data unchanged.

Completion check: `npm test && npm run lint && npm run test:e2e`

### Follow-Ups From Earlier Reviews
- From T0020: report a failed theme write, and explain why still-disabled Settings buttons are disabled.
