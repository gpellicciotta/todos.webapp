---
id: T0011
owner: ~
needs: [T0006]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read the requirements' Lists and Tasks sections and the service's data model and REST API specs.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write uuid7.js, the versioned schema, and the list and task store modules.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Describe the schema in docs/specs/local-store.md, link it from docs/index.md, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
