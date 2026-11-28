---
id: T0305
owner: "@claude"
needs: []
branch: task/T0305-export-adr-0006-fields-in-backup-format-3
worktree: .plan/work/T0305-export-adr-0006-fields-in-backup-format-3
status: active
started_at: "2026-11-28T05:39:01Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0305: Export ADR-0006 fields in backup format 3, and convert older backups on import

## Goals
Write backup format 3 with the ADR-0006 fields of todos.server, per backup-format.md after T0299.
Read formats 1, 2, and 3; convert `complete` and `uncomplete` in older files as the specs say.
Keep merge imports per row, as `BAK-6` requires.

## Task Execution Steps
- [ ] **[Read]**      Read backup-format.md and backup.js.
- [ ] **[Implement]** Author failing backup tests for format 3 and the conversion of formats 1 and 2.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reason.
- [ ] **[Implement]** Write format 3 and convert older formats on import.
- [ ] **[Verify]**    Run the new and affected tests and confirm they pass.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
