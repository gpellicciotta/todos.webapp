## Technical Specifications

### Declared Files
- src/manifest.webmanifest
- src/service-worker.js
- src/img/app-icon.svg
- scripts/render-app-icons.mjs
- tests/unit/precache.test.js
- tests/e2e/pwa.spec.js
- docs/devops.md

Size estimate: 7 files, 300 lines, plus the generated PNG icons
Mechanical command: `node scripts/render-app-icons.mjs`

### Tests
- Unit: every file under `src/` that the app loads, outside `src/demo/`, is in the precache list.
- Integration: after one online visit, the app reloads and navigates with the network disabled.
- Integration: the manifest is served as `application/manifest+json` with name, start URL, display mode, and icons.

Completion check: `npm test && npm run lint && npm run test:e2e`
