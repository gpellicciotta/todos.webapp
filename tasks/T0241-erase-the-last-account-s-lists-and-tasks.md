---
id: T0241
owner: "@claude"
session: claude-20261117-665b8f
needs: []
branch: task/T0241-erase-the-last-account-s-lists-and-tasks
worktree: .plan/work/T0241-erase-the-last-account-s-lists-and-tasks
status: active
started_at: "2026-11-17T11:02:32Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0241: Erase the last account's lists and tasks on the next connect after Delete all data in local mode

## Goals
Make a Delete all data done in local mode reach the account on the next connect.
- Record a pending erase with its time and the account this device was last connected to.
- On connect to that same account, erase its data created before that time, then adopt the local data.
- On connect to another account, or from a device never connected, ask before erasing anything.
- Rules and tests: [technical-spec.md](T0241-erase-the-last-account-s-lists-and-tasks/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the T0240 erase entry, adopt.js, the disconnect in pull.js, and the connect flow in Settings.
- [x] **[Doc]**       Update BAK-15, CON-4, the local store spec, and the Settings design.
- [x] **[Implement]** Author failing unit tests for the pending erase, the account match, the question, and the order.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the pending erase, the last account, the connect question, and the erase before adoption.
- [x] **[Verify]**    Run the unit, e2e, and contract suites and confirm they pass.
- [x] **[Visual]**    Capture the connect question in light and dark themes.
- [x] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's Delete all data decisions.

- [2026-11-17] **[Decided]**
  A refused (4xx) pending erase is logged and dropped, then adoption runs, matching the queued erase; only offline, 5xx, or 401 keep it.

- [2026-11-17] **[Decided]**
  Answering waits in a new question sync state; last-account comes from account, adoption, or cursor state, so engine.js needed no logic change.

- [2026-11-17] **[Implement]**
  Added pending-erase, last-account, the settle step before adoption, the question state, and the Settings question.
  - Undeclared: push.js, engine.js, sync-indicator.js, bin.test.js, service-worker.js.
  - Mechanical: sw-precache-hashes.json via check-sw-version.mjs --update.

- [2026-11-17] **[Verify]**
  Unit, contract, connect e2e, lint, and SW check pass; the full e2e had one load-related gallery failure that passes alone.
  - Details in validation-proof.md.

- [2026-11-17] **[Visual]**
  Captured the section [before](T0241-erase-the-last-account-s-lists-and-tasks/erase-question-before.png) and the question after, in [light](T0241-erase-the-last-account-s-lists-and-tasks/erase-question-after-light.png) and [dark](T0241-erase-the-last-account-s-lists-and-tasks/erase-question-after-dark.png).

- [2026-11-17] **[Doc]**
  Size note: 16 counted files and 573 lines, above the typical line, since the record, question, and erase only work together.
  - Files touched: 16.
  - Lines touched: 573.
  - Reopenings: 0.

