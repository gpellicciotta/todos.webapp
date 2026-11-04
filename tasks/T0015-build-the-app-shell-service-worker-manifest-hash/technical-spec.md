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

### Follow-Ups From Earlier Reviews
- From T0012: handle IndexedDB `versionchange` by closing old connections, and turn `blocked` into a `StoreError`.
- From T0014: on start, run overdue handling, then `purgeExpired`, like the service; start the overdue timer.
- From T0031: give the current nav item a logical inset edge plus hover and active feedback; replace unitless token math.
- From T0031: match the sync dot's ring to its actual ground, and add a bottom bar active specimen.
- From T0030: show toasts only after a modal closes (body is inert meanwhile), and give keyboard users a quick way to reach Undo.
- From T0030: use the existing `.visually-hidden` class for the live region instead of inline styles.
