## Technical Specifications

### Decisions
- The user decided on 2026-11-04: no custom domain yet; publish at the default GitHub Pages address.
- The app uses relative URLs, so it works under the `/todos.webapp/` sub-path; `TEC-11` gets its domain later.

### Declared Files
- .github/workflows/pages.yml
- docs/devops.md

Size estimate: 2 files, 120 lines

### Tests
- Unit test: none (the workflow has no logic of its own to unit test).
- Integration: `npx actionlint`, or a local `act` dry run, accepts the workflow, and the checks it runs pass locally.

Completion check: `npm test && npm run lint && npm run test:e2e`, then human review of the workflow

### Follow-Ups From Earlier Reviews
- From T0034: enforce a service worker VERSION bump when a precached file changes, for example with a content hash check in CI.
- From T0034: consider letting old pages finish before `skipWaiting` deletes the previous cache.
