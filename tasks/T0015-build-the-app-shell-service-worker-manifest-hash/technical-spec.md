## Technical Specifications

### Declared Files
- src/index.html
- src/js/app.js
- src/js/ui/router.js
- src/js/ui/layout.js
- src/css/app-shell.css
- tests/unit/router.test.js
- tests/e2e/shell.spec.js
- tests/e2e/index.spec.js
- docs/specs/ui-design.md

Size estimate: 9 files, 450 lines
Size note: split on 2026-11-04 after reaching 1692 lines; about 1050 lines stay here.

### Tests
- Unit: the router parses and formats every documented route, and unknown routes fall back to All tasks.
- Unit: navigating back restores the previous route's scroll position.
- Integration: the layout switches between compact and wide at 64rem, at 390 and 1440 px.
- Integration: navigation marks the current route with `aria-current`, and the sidebar lists the stored lists.
- Integration: the shell loads without console errors, failed requests, or horizontal scrolling.

Completion check: `npm test && npm run lint && npm run test:e2e`

### Follow-Ups Moved Out
- Store `versionchange`, `blocked`, and subscriptions: T0032.
- Design system follow-ups from T0030 and T0031: T0033.
- Manifest, service worker, icons, and offline tests: T0034.
- From T0014, kept here: on start, run overdue handling, then `purgeExpired`, then start the overdue timer.
