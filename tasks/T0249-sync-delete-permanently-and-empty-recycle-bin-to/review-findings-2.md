---
task: T0249
round: 2
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T01:49:23Z
reviewed_commit: "b2fbebb"
base_commit: "f5eadb7"
branch: task/T0249-sync-delete-permanently-and-empty-recycle-bin-to
---
# Review Findings: Task T0249 (Round 2)

## Summary
**[Decided]** Rejected because the previously required production prerequisite remains unestablished.

Reviewed the task, specifications, execution log, prior findings, validation proof, branch history, and complete branch diff.
Focused verification on the previous required rework and its changes.

B1 is resolved: earlier entries survive, including in-flight creates and lost replies, for tasks and lists.
B2 is resolved: recovery retains its purge until the read, local changes, cursor reset, and notice complete.
Regression tests cover recovery reads failing with network errors, 503, and 401, followed by successful retries.

Independent affected tests passed:

Command: `npx vitest run tests/unit/bin.test.js tests/unit/push.test.js tests/unit/queue.test.js`; exit code: 0.

```text
 Test Files  3 passed (3)
      Tests  81 passed (81)
   Start at  02:49:53
   Duration  1.39s (tests 53%, import 28%, transform 14%, setup 3%, worker 2%)
```

Command: `npx eslint .`; exit code: 0; no output.

Inspected recorded full-unit, affected e2e, and contract evidence rather than repeating those suites.
The updated contract evidence reports 20 passing tests against a post-T0257 artifact.
No implementation files were changed; Git status remained clean.

## Defects
### B1: Blocking: the declared production prerequisite remains unestablished
The task explicitly blocks completion until todos.server T0257 serves the purge routes in production.
Round 1 required establishing that prerequisite or obtaining a human decision changing it.
The latest execution log and validation proof explicitly state production deployment remains unverified.
A passing local contract run establishes local compatibility, not production availability.

This matters because `src/js/sync/push.js` treats purge-route 404 responses as completed and removes the queued operations.
Against a service lacking these routes, permanent deletion remains local and its account purge is lost.
The validation proof acknowledges this behavior; upgrading the service later cannot replay those removed operations.
This is the remaining part of round 1 finding B3, not a new requirement.

## Process Gaps
Non-blocking: the successful contract command names `<scratch install>` instead of the actual invocation or a reproducible setup.
Preserve the exact command and artifact setup in future evidence.
The earlier failing-first evidence still omits failure details; this does not independently block approval.

## Required Rework
- Establish that the configured production service serves the T0257 purge routes, recording attributable verification evidence.
- If verification is unavailable, a human must explicitly decide whether to change the production prerequisite and completion criterion.
- Do not treat a missing-route 404 as evidence of production readiness or a passing local contract run as deployment proof.
