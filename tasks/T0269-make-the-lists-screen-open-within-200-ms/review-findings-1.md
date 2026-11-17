---
task: T0269
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T05:22:36Z
reviewed_commit: "0932d14"
base_commit: "e173243"
branch: task/T0269-make-the-lists-screen-open-within-200-ms
---
# Review Findings: Task T0269 (Round 1)

## Summary
**[Decided]** Rejected for one unresolved intermittent failure in the affected Lists end-to-end suite.
The performance goal passed: 150 lists and 5000 tasks opened in 157, 158, and 157 ms under 4x throttling.
The 500-list recording had a 351 ms median.

Independent checks:
- `npx vitest run tests/unit/list-snapshot.test.js`: exit 0; five tests passed.
- `npx eslint .`: exit 0.
- `npm run check:sw`: exit 0; 131 precached files matched.
- `npx playwright test --config playwright.perf.config.js --grep "Lists opens"`: exit 0; three tests passed.
- `npx playwright test tests/e2e/lists.spec.js tests/e2e/lists-many-rows.spec.js tests/e2e/lists-find.spec.js`: exit 1; 19 passed, one failed.
- `npx playwright test tests/e2e/lists-many-rows.spec.js --grep "a Back"`: exit 0; the isolated rerun passed.

## Defects
- Blocking: the 300-row Back-navigation scroll-restoration check failed at `tests/e2e/lists-many-rows.spec.js:81`.
  The test required `scrollTop > 11234`, but observed `10958` after its five-second polling timeout.
  The isolated rerun passed; the original failure remains unresolved.
  This review does not establish whether the change introduced the failure or exposed an existing intermittent defect.

## Process Gaps
- Non-blocking: the final performance evidence omits its exact command, and output fences omit language identifiers.
- Non-blocking: the documented npm completion command found no tests in this PowerShell environment.
  Direct Playwright invocation with `--grep "Lists opens"` worked and verified the acceptance criterion.

## Required Rework
Investigate the scroll-restoration failure under the affected suite's normal parallel execution.
Fix a regression, or provide baseline evidence and document an existing intermittent failure with its follow-up task.
Capture the affected suite's final verification output and retain the initial failure evidence.
