---
id: T0063
owner: ~
needs: [T0026]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0063: Add an opt-in contract test that runs the sync client against a real todos server

## Goals
Run the sync client against a real todos server in an opt-in contract test, so protocol drift shows before a release.
Start the server with its in-memory database, then check upload, download, first-connect adoption, `410`, and `426`.
Skip the test unless `TODOS_SERVER_DIR` names a todos checkout; `npm test` and CI stay independent of the sibling repository.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the todos devops.md server commands, the sync spec, and how its verification obtains a bearer token.
- [ ] **[Implement]** Write the contract tests listed in technical-spec.md, skipped when `TODOS_SERVER_DIR` is unset.
- [ ] **[Verify]**    Run them against the server and confirm they fail first for a missing client feature.
- [ ] **[Implement]** Add the server start and stop helper, the `test:contract` script, and the docs.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Document `test:contract` in devops.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-07] **[Decided]**
  Created from the sync design review: mocked REST tests alone cannot catch drift from the real server.
