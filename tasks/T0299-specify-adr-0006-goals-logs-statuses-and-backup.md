---
id: T0299
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0299: Specify ADR-0006 goals, logs, statuses, and backup format 3 in the local store and backup format specs

## Goals
Specify ADR-0006 of todos.server for the local store and backups, so local mode matches the service.
In docs/specs/local-store.md, cover goal fields, `start-time`, the `year` unit, `progress`, `time-spent-seconds`, and `failed`.
Also cover `log` and `undo-log` events, the fold, closing rules, carried readings, and the upgrade of local legacy events.
In docs/specs/backup-format.md, specify format 3 with the new fields, and the conversion of formats 1 and 2.
Follow todos.server business-logic-spec.md once its task T0293 lands.

## Task Execution Steps
- [ ] **[Read]**      Read ADR-0006, the todos.server specs, local-store.md, and backup-format.md.
- [ ] **[Doc]**       Update local-store.md for goals, start times, the log, the fold, statuses, and the store upgrade.
- [ ] **[Doc]**       Update backup-format.md for format 3 and the conversion of older formats.
- [ ] **[Verify]**    Lint both specs.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.
