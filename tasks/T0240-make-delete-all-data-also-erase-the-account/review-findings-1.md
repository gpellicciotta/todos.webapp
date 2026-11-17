---
task: T0240
round: 1
verdict: rejected
blocking: 1
reviewer: "@codex"
reviewed_at: 2026-11-17T03:32:57Z
reviewed_commit: "94cfbe9"
base_commit: "756bc33"
branch: task/T0240-make-delete-all-data-also-erase-the-account
---
# Review Findings: Task T0240 (Round 1)

## Summary
Rejected: the required real-server erase contract check fails with the available server artifact.
Affected unit tests passed: 136 tests across four files. Affected browser tests passed: 19 tests.
ESLint and the service-worker precache check passed. The code worktree remained clean.

## Defects
1. **Blocking — Required real-server erase integration remains failing.**
   `tests/contract/sync.contract.test.js:509` expects an `erased` log record but receives `error`.
   The contract suite exits 1: 17 passed, 4 failed, including the new erase scenario.
   This reproduces the worker's evidence and fails the technical specification's explicit completion check.
   The available server jar is dated November 15, before the required erase route.
   Mocked tests cannot establish successful account erasure and cross-device tombstones against the real service.
   This identifies an unresolved integration dependency; it does not establish a client implementation defect.

## Process Gaps
- **Non-blocking:** `docs/specs/local-store.md` still says `deleteAllData` queues nothing and is offered only while disconnected.
  Remove that obsolete sentence beneath the updated method description.
- **Non-blocking:** the task treats a released server version as proof that the production dependency shipped.
  The execution log supplies no production deployment evidence for the explicitly stated prerequisite.

## Required Rework
1. Provide a current real-server artifact exposing the erase route, then rerun the contract suite successfully.
   Verify account rows disappear and another device receives the expected tombstones; retain command output as evidence.
   Existing purge failures must also pass with the current artifact, as required by the completion check.
   If rebuilding requires sibling-repository writes, a human must authorize that rebuild or supply the built artifact.
2. Verify the required route is deployed in production before enabling this feature, as the task goals require.
   If deployment cannot be verified, a human must decide whether to defer integration or revise that prerequisite.

Review commands:
- `npx vitest run tests/unit/bin.test.js tests/unit/push.test.js tests/unit/engine.test.js tests/unit/settings.test.js`: exit 0; 136 passed.
- `npm run lint`: exit 0.
- `node scripts/check-sw-version.mjs`: exit 0; 129 precached files match VERSION 2026-11-17.12.
- `npx playwright test tests/e2e/bin-settings.spec.js tests/e2e/sync.spec.js`: exit 0; 19 passed.
- `$env:TODOS_SERVER_DIR='C:/Dev-Projects/todos.server'; npm run test:contract`: exit 1; 17 passed, 4 failed.

Both test sessions finished before this verdict was saved.
