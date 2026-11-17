---
task: T0077
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T06:23:15Z
reviewed_commit: "e7b45f3"
base_commit: "cf9fec7"
branch: task/T0077-add-a-150-list-render-check-to-the
---
# Review Findings: Task T0077 (Round 1)

## Summary
**[Decided]** Rejected because the specified completion check failed, although both target Lists checks passed.
The branch has no net diff against main; T0269 already supplied the deliverable.
The existing spec seeds 5000 tasks, asserts 150 lists under 4x throttling, and records 500 lists without a timing assertion.
The design records measured times, and T0270 tracks windowing after the two-times threshold was exceeded.
Task completion validation passed.

## Defects
- Blocking: `npm run test:perf` exited 1 with two failures and three passes.
  All tasks measured 311.6 ms against 200 ms at `tests/e2e/performance.spec.js:225`.
  Grouping by due date measured 281.4 ms against 200 ms at `tests/e2e/performance.spec.js:265`.
  These checks already exist on main; this review establishes no branch regression.
  Nevertheless, the technical specification explicitly requires the full performance command to pass.

Target checks passed in the same isolated, single-worker run:

```text
4x CPU throttling, 150 lists: Lists open 157, 158, 158 ms (median 158 ms)
4x CPU throttling, 500 lists: Lists open 375, 339, 337 ms (median 339 ms)
```

## Process Gaps
- Non-blocking: The validation proof records only a filtered command rather than the full specified completion check.
  Its reported three passes also differ from the two current tests matching `Lists opens`.
  Preserve actual command output when refreshing evidence.

## Required Rework
- Establish why the existing All tasks checks failed and provide a passing full `npm run test:perf` run.
  Do not raise the performance budgets.
  If baseline failures require separate work, obtain a human decision explicitly narrowing this task's completion requirement.
- Refresh validation evidence with the exact command, exit code, and verbatim results.
