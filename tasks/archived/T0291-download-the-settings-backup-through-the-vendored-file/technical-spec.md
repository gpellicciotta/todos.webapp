## Technical Specifications

### Declared Files
- src/js/views/settings.js
- src/service-worker.js
- tests/unit/settings.test.js

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 3 files, 40 lines

### Tests
- Unit: saving a backup creates one object URL for an `application/json` blob, names it `backupFileName(now)`, and revokes it.
- Integration: backup.spec.js downloads a file that `importBackup` reads back unchanged.

Completion check: python scripts/devops.py check
