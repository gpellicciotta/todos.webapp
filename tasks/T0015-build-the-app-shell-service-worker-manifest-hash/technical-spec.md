## Technical Specifications

### Declared Files
- src/index.html
- src/manifest.webmanifest
- src/service-worker.js
- src/js/app.js
- src/js/ui/router.js
- src/js/ui/layout.js
- tests/unit/router.test.js
- tests/e2e/shell.spec.js

Size estimate: 8 files, 450 lines
Size note: the PWA pieces, router, and layout only work together.

### Tests
- Unit: the router parses every documented route, and unknown routes fall back to All tasks.
- Unit: navigating back restores the previous route's scroll position.
- Integration: after one online visit, the app reloads and navigates with the network disabled.
- Integration: the layout switches between compact and wide at 64rem, at 390 and 1440 px.
- Integration: the app passes a Lighthouse-style installability check through the manifest and service worker.

Completion check: `npm test && npm run lint && npm run test:e2e`
