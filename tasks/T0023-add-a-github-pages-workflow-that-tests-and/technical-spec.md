## Technical Specifications

### Declared Files
- .github/workflows/pages.yml
- src/CNAME
- docs/devops.md

Size estimate: 3 files, 120 lines

### Tests
- Unit test: none (the workflow has no logic of its own to unit test).
- Integration: `npx actionlint`, or a local `act` dry run, accepts the workflow, and the checks it runs pass locally.

Completion check: `npm test && npm run lint && npm run test:e2e`, then human review of the workflow
