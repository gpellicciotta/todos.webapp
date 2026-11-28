---
task: T0227
round: 1
verdict: approved
blocking: 0
reviewer: "@gemini"
reviewed_at: 2026-11-28T03:37:10Z
reviewed_commit: "c69188c"
base_commit: "3c0ae4f"
branch: task/T0227-deliver-due-reminders-with-the-app-closed-through
session: antigravity-20261128-56414b
session_agent: antigravity
session_created_at: 2026-11-28T03:35:39Z
---
# Review Findings: Task T0227 (Round 1)

## Summary
TL;DR: The work meets the goals. Approved with one non-blocking note on the contract suite.

- The subscription client subscribes only while connected, with reminders on and permission granted. It sends the lead time and a device name, and it patches the registration when the lead time changes.
- The worker shows pushed reminders with the local `task-due:{{task-id}}:{{due-time}}` tag, so a push replaces a local one. An unreadable payload still shows a generic notification.
- Disconnect runs a `beforeDisconnect` hook while the token is valid. Turning reminders off, a lost session, and sign-out release the subscription.
- Local mode sends no push request.
- Settings shows the push state, including the iOS Home Screen hint.

Verified in the worktree:
- `npm test`: 72 files, 1986 tests pass.
- `npx playwright test tests/e2e/reminders.spec.js`: 3 passed.
- `npm run lint` and `npm run check:sw`: pass.
- `npm run test:contract` with `TODOS_SERVER_DIR=../../../../todos.server`: 7 passed, 16 failed. The new push test is among the passes.
- The same command on the main checkout at 3c0ae4f: 6 passed, 16 failed. The 16 failures pre-exist and match the log.

## Defects
None.

## Process Gaps
- Non-blocking: the completion check says `npm run test:contract` passes, but 16 older sync tests fail. They fail the same on main, so this task did not cause them. The built todos.server jar probably predates the ADR-0006 task model. **[Feedback Needed]** A human must decide to rebuild the todos.server jar, or to accept the baseline failures, before the contract check can pass as written.
- Non-blocking: the declared tests list `tests/unit/service-worker.test.js`. The worker tests went into the new `tests/unit/service-worker-notification.test.js`. No deliverable changes.
- Non-blocking: the e2e test dispatches a synthetic push event and records `showNotification`. It does not show a real notification. The log defers that to todos.server T0308 and T0317.

## Required Rework
None.
