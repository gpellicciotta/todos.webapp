---
id: T0011
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T01:13:25Z"
ended_at: "2026-11-04T01:19:30Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 2
reviewed_by: "@claude-review-agent"
completion-commit: b1935051bce3880af50a2348babf8257394efc14
---
# T0011: Build the IndexedDB data store for lists, tasks, and memberships, with UUIDv7 identifiers and validation

## Goals
Add a versioned IndexedDB schema under `src/js/store/` for lists, tasks, and list memberships (`LOC-4`, `LOC-5`).
Generate UUIDv7 identifiers in the client (`TEC-9`).
Implement list create, rename, describe, and case-insensitive unique names (`LST-1` to `LST-4`).
Implement task create, update, status, due time, overdue behavior, and list membership (`TSK-1` to `TSK-10`, `TSK-12`).
Store records with the field names of the service's `List` and `Task` schemas, so sync can map them directly.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the requirements' Lists and Tasks sections and the service's data model and REST API specs.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write uuid7.js, the versioned schema, and the list and task store modules.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Doc]**       Describe the schema in docs/specs/local-store.md, link it from docs/index.md, and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 rejected by @claude-review-agent: Wall-clock dependent uuid7 test; date-only due times not stored as 23:59 local (TSK-6); minor: untrimmed descriptions, undefined changes, import cycle.

- [2026-11-04] **[Verify]**
  Red phase: all three new test files failed on the missing uuid7.js and store modules.

- [2026-11-04] **[Implement]**
  Added uuid7.js, the versioned schema, list and task stores, and memberships; positions arrive with T0013.

- [2026-11-04] **[Review]**
  Round 1 rejected for a wall-clock test and date-only due times; fixed both plus three minor findings.
  - 66 tests pass in three time zones.

- [2026-11-04] **[Doc]**
  Size note: about 1036 lines in 14 files pass the typical line, mostly docstrings and tests.
  - Undeclared files: idb.js, store-helpers.js, CHANGELOG.md.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 14.
  - Lines touched: 1036.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 2 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

