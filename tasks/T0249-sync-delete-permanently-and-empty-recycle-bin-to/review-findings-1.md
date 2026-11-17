---
task: T0249
round: 1
verdict: rejected
blocking: 3
reviewer: "@codex"
reviewed_at: 2026-11-17T01:41:35Z
reviewed_commit: "1e8aaf7"
base_commit: "f5eadb7"
branch: task/T0249-sync-delete-permanently-and-empty-recycle-bin-to
---
# Review Findings: Task T0249 (Round 1)

## Summary
**[Decided]** Rejected for two reproduced behavior defects and incomplete required contract verification.

Independent checks passed.

- `npx vitest run tests/unit/bin.test.js tests/unit/push.test.js tests/unit/queue.test.js`: exit 0; 75 tests passed.
- `npx eslint .`: exit 0; no output.
- `npx playwright test tests/e2e/sync.spec.js tests/e2e/bin-settings.spec.js`: exit 0; 16 tests passed.

The browser runner completed under tool session `35150`; its local server reported PID `22460`.
Reviewed the complete branch diff, task specifications, execution log, and validation evidence.
No implementation files were changed.

## Defects
### B1: Blocking: queued creation does not prove the row never reached the service
In `src/js/sync/queue.js:468-482`, every queued create causes the row's entire queue history to disappear without a purge.
A queued create can already be uploading, or its server response can have been lost.

Reproduced using the existing in-memory store and fake service through `node --input-type=module`.
Paused a task POST, deleted and permanently purged the task locally, then released the POST.
The queue became empty, and the server retained an active task.
A later pull can resurrect that task, violating permanent deletion.

Observed output, exit 0:

```text
Queue after local purge: []
Drain: synced
Server row survived: true
Server deletion-time: null
Local row: undefined
```

The same assumption affects lists and trimming their references from queued task creations.

### B2: Blocking: interrupted conflict recovery loses its durable work
In `src/js/sync/push.js:195-207`, the purge entry is removed before the recovery GET succeeds.
Network failure, 5xx, or 401 during that GET exits before storing the row, resetting the cursor, or recording the notice.
The next drain has no recovery entry to retry.
A restore already covered by the saved cursor can therefore remain missing locally.
A 401 also violates the specified requirement to retain the queued operation while paused.

Reproduced a 409 followed by a network failure on the recovery GET using the existing store and fake service.
After connectivity returned, another drain reported success without recovering the task.
The saved cursor remained unchanged, and the required recovery notice was absent.

Observed output, exit 0:

```text
First drain: retry
Pending recovery: 0
Cursor: {"account":{"email":"ada@example.com","server":"https://todos.example.com"},"value":"after-restore"}
Log: []
Second drain: synced
Local row recovered: false
```

### B3: Blocking: the required service contract verification has not passed
The completion check requires `npm run test:contract` to pass.
The implementation evidence instead reports 17 passing tests and three failing new purge tests, exit 1.
The execution step claims completion despite explicitly recording that contract verification remains unconfirmed.

The available server jar has modification time November 15, before the documented T0257 implementation.
This review did not rerun the known stale artifact or rebuild the sibling repository.
No passing T0257 contract evidence or production availability evidence establishes the task's declared service prerequisite.
This is an unmet completion criterion, not an assertion that the new contract tests fail against current server source.

## Process Gaps
Non-blocking: the failing-first evidence contains only test counts, without failure details proving the expected failure reasons.

## Required Rework
- Preserve ordered trash and purge work whenever creation may have reached the service, including in-flight requests and lost responses.
- Add regression tests for both cases, covering tasks and lists.
- Keep conflict recovery durable until the GET, local restore, cursor reset, and required notice have completed.
- Add recovery tests for network failure, 5xx, and 401, followed by a successful retry.
- Run the affected tests and contract suite against a T0257-capable server, recording exact commands, exit codes, and output.
- Establish the declared production prerequisite before completion.
- If that verification is unavailable, a human must supply a current artifact or explicitly change the prerequisite and completion criterion.
