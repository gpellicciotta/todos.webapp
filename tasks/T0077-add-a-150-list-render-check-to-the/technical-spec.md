## Technical Specifications

Design source: docs/specs/ui-design.md, sections Sidebar With Many Lists and Lists Overview (Many Lists), written by T0056.

### Declared Files
- tests/e2e/performance.spec.js
- docs/specs/ui-design.md

Size estimate: 2 files, 90 lines
Completion check: `npm run test:perf`

### Tests
- Unit test: none (the task adds a performance check, which the integration test covers)
- Integration: `npm run test:perf` seeds 150 lists and 5000 tasks, opens `#/lists` under 4x CPU throttling, asserts the first rows within 200 ms, then records a 500-list run.

### Notes
- If 150 lists miss 200 ms, report it and open a task for windowing; do not raise the limit.
