---
id: T0063
owner: "@claude"
session: claude-20261107-98c8b6
needs: []
branch: task/T0063-add-an-opt-in-contract-test-that-runs
worktree: .plan/work/T0063-add-an-opt-in-contract-test-that-runs
status: completed
started_at: "2026-11-07T20:08:13Z"
ended_at: "2026-11-07T20:22:42Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1278.2, input: 356, output: 109616, cache_read: 26702444, cache_write: 397128}
  review: {turns: 2, duration_s: 426.2, input: 148550, output: 5162, cache_read: 817656}
review_status: approved
review_round: 1
reviewed_by: "@gemini"
work_duration: 869.6
completion-commit: 27769316b5bde5fe1b19ba36f348a3401a973e9e
---
# T0063: Add an opt-in contract test that runs the sync client against a real todos server

## Goals
Run the sync client against a real todos server in an opt-in contract test, so protocol drift shows before a release.
Start the server with its in-memory database, then check upload, download, first-connect adoption, `410`, and `426`.
Skip the test unless `TODOS_SERVER_DIR` names a todos checkout; `npm test` and CI stay independent of the sibling repository.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the todos devops.md server commands, the sync spec, and how its verification obtains a bearer token.
- [x] **[Implement]** Write the contract tests listed in technical-spec.md, skipped when `TODOS_SERVER_DIR` is unset.
- [x] **[Verify]**    Run them against the server and confirm they fail first for a missing client feature.
- [x] **[Implement]** Add the server start and stop helper, the `test:contract` script, and the docs.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Document `test:contract` in devops.md and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Created from the sync design review: mocked REST tests alone cannot catch drift from the real server.

- [2026-11-07] **[Read]**
  Token source: no test route exists, so the helper runs a local Auth stand-in the server calls.

- [2026-11-07] **[Decided]**
  Cursor 410 is forged above the newest revision; only the purge job raises the tombstone floor.

- [2026-11-07] **[Verify]**
  Contract tests failed first: the sign-in callback answers JSON, which exchangeCode could not read.

- [2026-11-07] **[Implement]**
  Fixed exchangeCode to read the JSON callback answer, with a unit test and a service worker version bump.

- [2026-11-07] **[Decided]**
  Memory-db server answers 500 to notes; recorded as todos task T0207, and the note test uses it.fails.

- [2026-11-07] **[Verify]**
  Size note: 10 counted files, about 540 lines, above the typical line, below the large line.

- [2026-11-07] **[Verify]**
  Recorded task outcomes.
  - Files touched: 10.
  - Lines touched: 540.
  - Reopenings: 0.

- [2026-11-07] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-07] **[Review]**
  Round 1 approved by @gemini: Approved.
  - Findings: [review-findings-1.md](T0063-add-an-opt-in-contract-test-that-runs/review-findings-1.md).

- [2026-11-07] **[Complete]**
  Task completed successfully.

