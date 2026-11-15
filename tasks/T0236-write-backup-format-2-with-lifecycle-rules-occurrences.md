---
id: T0236
owner: "@claude"
needs: []
branch: task/T0236-write-backup-format-2-with-lifecycle-rules-occurrences
worktree: .plan/work/T0236-write-backup-format-2-with-lifecycle-rules-occurrences
status: active
started_at: "2026-11-15T11:46:57Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0236: Write backup format 2 with lifecycle rules, occurrences, and events, keeping format 1 importable

## Goals
Raise the backup format to version 2 with top-level `lifecycle-rules`, `occurrences`, and `events` arrays.
Treat `occurrences` as export-only: import rebuilds occurrences from rules and events.
Keep format 1 importable through the mapping T0224 added.
Add imported events by identifier in merge mode (`BAK-6`), posting them with `import: true` while connected.
Start after T0224 and todos.server T0241; follow the [T0215 design](../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the T0215 export rules, backup-format.md, backup.js, and the T0224 format 1 mapping.
- [ ] **[Implement]** Author unit tests that export format 2 and import formats 1 and 2 in both modes.
- [ ] **[Implement]** Author an e2e test that exports and reimports a target-3 task with completions.
- [ ] **[Verify]**    Run the unit and e2e suites and capture the expected red-phase failures.
- [ ] **[Implement]** Write format 2 and import it, rebuilding occurrences and replaying events with import true.
- [ ] **[Verify]**    Run npm test, the contract suite against a local server, and the e2e suite.
- [ ] **[Doc]**       Update backup-format.md, the backup requirements, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-13] **[Doc]**
  Wrote the backup format 2 part of the approved T0224 split.
