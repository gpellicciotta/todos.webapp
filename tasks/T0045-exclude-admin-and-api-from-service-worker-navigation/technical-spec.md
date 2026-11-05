### Declared Files
- src/service-worker.js
- tests/unit/service-worker.test.js
- tests/e2e/service-worker.spec.js
- CHANGELOG.md

Size estimate: 4 files, 60 lines

### Tests
- Unit: the fetch handler ignores `/admin`, `/admin/x`, and `/api/` paths and still serves shell assets.
- Integration: Playwright goes offline and confirms `/admin` is not answered with the app shell.

Completion check: npm test
