### Declared Files
- src/css/app-chrome.css
- src/css/app-components.css
- src/service-worker.js
- tests/e2e/shell.spec.js

### Tests
- Unit: none (CSS and test expectation changes only; the existing unit tests stay green)
- Integration: the 11 failing Playwright specs in gallery-app, gallery-chrome, shell, and sync pass.

Size estimate: 4 files, 20 lines

Completion check: npm run test:e2e
