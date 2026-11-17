---
task: T0240
round: 2
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T10:27:50Z
reviewed_commit: "813a8e2"
base_commit: "756bc33"
branch: task/T0240-make-delete-all-data-also-erase-the-account
---
# Review Findings: Task T0240 (Round 2)

## Summary
Rejected: the production prerequisite remains unverified.
The rebuilt server resolves the previous contract failure: all 21 tests pass, including erase and cross-device tombstones.
The obsolete disconnected-only documentation sentence was corrected. Rework introduced no code changes.

## Defects
1. **Blocking — Required production deployment remains unverified.**
   The task Goals explicitly block this feature until T0257 serves the erase route in production.
   Round 1 Required Rework item 2 required deployment verification or a human decision revising that prerequisite.
   The current Execution Log and validation proof explicitly state production deployment remains unverified.
   A passing local contract suite establishes compatibility with the rebuilt artifact, not its production deployment.
   This remains an unmet acceptance prerequisite, not an established client implementation defect.

## Process Gaps
None newly identified. The previous obsolete documentation sentence was corrected.

## Required Rework
1. Provide evidence that production serves `DELETE /api/users/{{user-id}}/data` before integrating the enabled feature.
   If deployment cannot be verified, a human must decide whether to defer integration or revise the production prerequisite.

Verification command (PowerShell), exit code 0:

```powershell
$env:TODOS_SERVER_DIR='C:/Dev-Projects/todos.server'; npm run test:contract
```

```text
 Test Files  1 passed (1)
      Tests  21 passed (21)
   Start at  11:28:38
   Duration  10.03s (tests 95%, import 3%, transform 2%)
```

The command completed before this verdict was saved; its tracked session identifier was 47507.
The contract harness stopped its temporary server. Existing unrelated server processes were left alone.
`git diff 94cfbe9..HEAD --check` exited 0; rework changes only the obsolete documentation sentence.
Reviewed `git log main..HEAD` and `git diff main...HEAD`; round 1's unchanged client checks were not rerun.
