### Declared Files
- tests/e2e/connect.spec.js

### Tests
- Unit: none (test-only change; no production code touched)
- Integration: connect.spec.js passes repeatedly, asserting only the first three service calls

Completion check: npx playwright test tests/e2e/connect.spec.js --repeat-each=10

Size estimate: 1 files, 3 lines
