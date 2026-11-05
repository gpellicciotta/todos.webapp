## Technical Specifications

### Declared Files
- docs/specs/backup-format.md
- src/js/core/backup.js
- tests/unit/backup.test.js
- tests/fixtures/backup-v1.json
- docs/index.md

Size estimate: 5 files, 450 lines
Combined task: the format spec and its only implementation cannot be verified apart.

### Tests
- Unit: an export contains lists, tasks, memberships with positions, notes, bin entries, and version fields.
- Unit: merge adds missing items, keeps the newer version of each item, and appends missing memberships.
- Unit: overwrite replaces own data and moves missing own items to the recycle bin.
- Unit: an invalid or unknown-version file returns an error and changes nothing.
- Integration: export, then overwrite import into an empty store, reproduces the same data (`BAK-14`).

Completion check: `npm test && npm run lint && python ../dev-guidelines/scripts/lint-markdown.py check docs`
