---
id: T0079
owner: "@claude"
session: claude-20261107-d8fba7
needs: []
branch: task/T0079-send-a-random-state-when-signing-in-through
worktree: .plan/work/T0079-send-a-random-state-when-signing-in-through
status: active
started_at: "2026-11-07T22:54:20Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1258.4, input: 144, output: 35458, cache_read: 5175500, cache_write: 153784}
  review: {turns: 4, duration_s: 497.0, input: 227122, output: 9670, cache_read: 1585286, cache_write: 0}
review_status: rejected
review_round: 1
work_duration: 917.4
reviewed_by: "@codex"
---
# T0079: Send a random state when signing in through Auth and reject a callback whose state does not match, to prevent login CSRF; needs Auth app-state support (auth T0206)

## Goals
Send a random state when signing in through Auth and reject a callback whose state does not match, to prevent login CSRF; needs Auth app-state support (auth T0206).

## Task Execution Steps
- [x] **[Implement]** Author failing tests for state generation, matching, and rejection.
- [x] **[Verify]**    Run the unit tests and prove the new tests fail.
- [x] **[Implement]** Send a random state and reject a returned state that is missing or differs.
- [x] **[Verify]**    Run unit, lint, e2e, contract, and service-worker checks and prove they pass.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-08] **[Implement]**
  Added app-state and state checking in the Auth adapter and session, plus a connect error message.
  - Contract from auth T0206.

- [2026-11-08] **[Verify]**
  Tests pass; the connect e2e test flakes on the baseline too.
  - Real-server contract tests pass.
  - Auth T0215 must forward state for password sign-in.

- [2026-11-08] **[Doc]**
  Documented the flow in devops.md, added a changelog bullet, and bumped the service worker VERSION.

- [2026-11-08] **[Implement]**
  Authored unit, e2e, and contract tests for the state first.

- [2026-11-08] **[Verify]**
  Proved the new unit tests fail before the implementation: 5 failed.

- [2026-11-08] **[Verify]**
  Recorded task outcomes.
  - Files touched: 9.
  - Lines touched: 144.
  - Reopenings: 0.

- [2026-11-08] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-08] **[Review]**
  Round 1 rejected by @codex: [Decided]** Rejected pending required verification evidence.
  - Findings: [review-findings-1.md](T0079-send-a-random-state-when-signing-in-through/review-findings-1.md).

- [2026-11-08] **[Verify]**
  Reworked validation-proof.md after review round 1: verbatim output, exit codes, red phase, baseline flake.
  - Flaky connect test fails on base too; backlog T0080.

