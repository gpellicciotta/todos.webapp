## Technical Specifications

### Notes
- theme-boot.js reads `data-theme-switch-app` from its script tag and the key `{{app}}.theme`; use `todos`.
- It accepts only plain `light` and `dark`; `writePreference` stores JSON, such as `"dark"` with quotes.
- Make `writeTheme` store the plain value; old JSON values still read through `readTheme` until the next change.
- `system` removes the key, so theme-boot leaves `data-theme` unset.

### Declared Files
- src/index.html
- src/js/core/preferences.js
- src/service-worker.js
- tests/unit/preferences.test.js
- docs/specs/ui-design.md
- Added, uncounted: tests/e2e/theme-boot.spec.js

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

Size estimate: 5 files, 80 lines

### Tests
- Unit: `writeTheme('dark')` stores plain `dark`; `writeTheme('system')` removes the key; `readTheme` reads both forms.
- Integration: theme-boot.spec.js stores `dark`, blocks js/app.js, loads the page, and finds `data-theme="dark"` on `<html>`.

Completion check: python scripts/devops.py check
