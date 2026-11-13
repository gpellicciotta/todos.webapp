## Technical Specifications
Design: [todos.server T0215 design](../../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md), section "Change Feed, Export, and Import".
Dependencies: T0224 (new task shape and the format 1 mapping) and todos.server T0241 (events route with `import`).

- **[Decided]** Raise the backup format version to 2 with top-level `lifecycle-rules`, `occurrences`, and `events` arrays.
- **[Decided]** Exported tasks embed nothing; the arrays refer to their task by `task-id`.
- **[Decided]** `occurrences` is export-only; import rebuilds occurrences from rules and events.
- **[Decided]** Version 1 backups still import through the mapping T0224 added.
- **[Decided]** Merge mode (`BAK-6`) compares `last-update-time`; imported events are added by identifier, never removed.
- **[Decided]** While connected, imported events post with `import: true`; the server accepts them from the task owner only.

### Declared Files
- `src/js/core/backup.js`
- `src/js/views/import-dialog.js`
- `tests/unit/backup.test.js`
- `tests/e2e/backup.spec.js`
- `tests/fixtures/backup-v2.json` (new)
- `docs/requirements.md`
- `docs/specs/backup-format.md`
- `CHANGELOG.md`

### Tests
- Unit: `backup.test.js` exports format 2, imports formats 1 and 2 in merge and overwrite modes, and drops imported `occurrences`.
- Unit: `backup.test.js` adds imported events by identifier in merge mode without duplicating existing ones.
- Integration: `backup.spec.js` exports a target-3 task with two completions, reimports it into an empty app, and sees `2/3`.

Size estimate: 6 files, 500 lines
Size note: Above the typical line in lines because format 2 needs both export and import paths with their merge rules.
Completion check: `npm test && npm run test:e2e`
