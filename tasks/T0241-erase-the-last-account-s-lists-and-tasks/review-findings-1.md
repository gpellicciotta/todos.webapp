---
task: T0241
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T11:23:14Z
reviewed_commit: "22e6024"
base_commit: "30be458"
branch: task/T0241-erase-the-last-account-s-lists-and-tasks
---
# Review Findings: Task T0241 (Round 1)

## Summary
**[Decided]** Rejected for one unmet failure-handling requirement. Successful erase, account matching, confirmation, and adoption ordering passed affected tests.

Reviewer verification, all exit code 0:
- `npx vitest run tests/unit/bin.test.js tests/unit/pull.test.js tests/unit/adopt.test.js tests/unit/settings.test.js tests/unit/push.test.js tests/unit/engine.test.js`: 189 tests passed.
- `npx playwright test tests/e2e/connect.spec.js --reporter=line`: 12 tests passed.
- `npm run lint`: passed.
- `npm run check:sw`: 131 precached files matched version 2026-11-17.23.

Browser supervision used session 75733 and server PID 35664; both finished. Lint/check supervision session 35172 also finished.
Recorded full-unit and contract evidence was inspected; those full suites were not rerun.

## Defects
- Blocking D1: Failed erases can be permanently forgotten before adoption.
  In `src/js/sync/adopt.js:274-284`, a refused erase logs an error, clears `pending-erase`, and permits adoption.
  The existing 403 test at `tests/unit/adopt.test.js:264` confirms this behavior and passed during review.
  The task specification requires failed erases to stop connection and retain `pending-erase` for another attempt.
  Consequently, a 403 leaves old account data intact while uploading new local data and consuming the erase intent.
  The implementation log explicitly chose this behavior, but the task specification still requires retention.

## Process Gaps
- Non-blocking: The purported before screenshot was captured after Keep on the implemented branch.
  This is disclosed in the validation proof, but does not provide the required actual pre-change capture.
- Non-blocking: A successful isolated gallery rerun does not establish load as the earlier failure's cause.
  Report the cause as unconfirmed unless further evidence establishes it.

## Required Rework
- Preserve `pending-erase` and stop before adoption whenever the erase fails, including refused 4xx responses.
- Replace the 403 drop-and-adopt expectation with retention and no-upload assertions; verify retry succeeds before adoption.
- Align the local-store documentation with the task's failure-handling requirement.
- If dropping refused erases is desired instead, obtain a human decision explicitly changing that acceptance requirement.
