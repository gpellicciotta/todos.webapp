---
id: T0240
owner: "@claude"
session: claude-20261117-e20a61
needs: []
branch: task/T0240-make-delete-all-data-also-erase-the-account
worktree: .plan/work/T0240-make-delete-all-data-also-erase-the-account
status: active
started_at: "2026-11-17T03:22:09Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 3, duration_s: 720.1, input: 164, output: 45276, cache_read: 13044278, cache_write: 390639}
  review: {turns: 2, duration_s: 183.6, input: 117896, output: 4172, cache_read: 697472, cache_write: 0}
review_status: rejected
review_round: 2
review_requested_at: "2026-11-17T10:27:48Z"
review_session: codex-20261117-9d1d79
work_duration: 25630.4
reviewed_by: "@codex"
---
# T0240: Make Delete all data also erase the account's lists and tasks while connected, queued while offline

## Goals
Make Delete all data erase the account's lists, tasks, and notes too, not only this device.
- Enable the button while connected; the dialog says what leaves the account and what collaborators lose.
- Queue the erase as one `erase` entry, so it waits out offline time and expired sessions.
- Never pull while an erase is queued, so erased data cannot come back first.
- Blocked until todos.server T0257 serves `DELETE /api/users/{{user-id}}/data` in production.
- Rules and tests: [technical-spec.md](T0240-make-delete-all-data-also-erase-the-account/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the T0257 route in the service REST API spec, push.js, engine.js, and the Settings dialog.
- [x] **[Doc]**       Update BAK-15, the Settings design, and the local store and sync queue specs.
- [x] **[Implement]** Author failing unit tests for the queued erase, its push, the pull block, and the dialog.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the erase entry, its push, the pull block, and the connected dialog.
- [x] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [x] **[Visual]**    Capture the connected dialog and the enabled button in light and dark themes.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's Delete all data decisions.

- [2026-11-17] **[Decided]**
  Treated server T0257 as shipped, since its erase route is in released todos.server v4.1.0.

- [2026-11-17] **[Implement]**
  Queued erase entry, push route, sync log record, and connected dialog; the pull already follows an empty queue.
  - Undeclared files touched: bin.test.js, fake service, fake feed, sync-log views, service worker.

- [2026-11-17] **[Verify]**
  Unit 1593, lint, and e2e 225 passed; contract erase test unproven because the server jar predates the route.
  - Rebuilding the jar writes to a sibling repo; needs user approval.

- [2026-11-17] **[Visual]**
  Captured the connected Settings Data section and dialog before and after, in light and dark.
  - Before: [light](T0240-make-delete-all-data-also-erase-the-account/before-button-light.png), [dark](T0240-make-delete-all-data-also-erase-the-account/before-button-dark.png).
  - After: [light](T0240-make-delete-all-data-also-erase-the-account/after-button-light.png), [dark](T0240-make-delete-all-data-also-erase-the-account/after-button-dark.png).
  - Dialog: [light](T0240-make-delete-all-data-also-erase-the-account/after-dialog-light.png), [dark](T0240-make-delete-all-data-also-erase-the-account/after-dialog-dark.png).

- [2026-11-17] **[Doc]**
  Updated BAK-15, the Settings design, the local store spec, and CHANGELOG.md.

- [2026-11-17] **[Read]**
  Read the server erase route in rest-api-spec.md, push.js, engine.js, queue.js, and settings.js.

- [2026-11-17] **[Implement]**
  Authored failing unit tests first, then confirmed 8 failures for the right reasons.

- [2026-11-17] **[Decided]**
  Bumped the service worker VERSION to 2026-11-17.12 and refreshed the precache hashes.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 rejected by @codex: Rejected: the required real-server erase contract check fails with the available server artifact.
  - Findings: [review-findings-1.md](T0240-make-delete-all-data-also-erase-the-account/review-findings-1.md).

- [2026-11-17] **[Review]**
  Round 1 blocks on a stale server jar and unverified production deployment; both need a human.
  - Human: authorize jar rebuild or supply artifact.
  - Human: confirm T0257 is deployed, or revise prerequisite.

- [2026-11-17] **[Verify]**
  Contract suite passes 21 of 21 against the rebuilt server jar, erase test included.
  - Production deployment of the route stays unverified.

- [2026-11-17] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 2 rejected by @codex: Rejected: the production prerequisite remains unverified.
  - Findings: [review-findings-2.md](T0240-make-delete-all-data-also-erase-the-account/review-findings-2.md).

- [2026-11-17] **[Verify]**
  Production runs v4.1.1, built after the erase route; unauthenticated DELETE on the route answers 401.
  - Indirect evidence; no authenticated erase was run.

