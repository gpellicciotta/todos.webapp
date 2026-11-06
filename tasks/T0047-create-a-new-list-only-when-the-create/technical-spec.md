### Decisions
- **[Decided]** Create or Enter in the name field saves a new draft; Escape or the close button discards it.
- **[Decided]** Create remains disabled until shared read-only store validation accepts the draft.
- **[Decided]** Recycled duplicate names follow existing store validation, including per-owner uniqueness.
- **[Decided]** Successful creation keeps the editor open in edit mode, saving subsequent changes automatically.
- **[Decided]** Draft fields lock while creation is pending to prevent lost edits and duplicate submissions.

### Declared Files
- [list-editor.js](../../../src/js/views/list-editor.js)
- [lists.js](../../../src/js/store/lists.js)
- [db.js](../../../src/js/store/db.js)
- [version.js](../../../src/js/version.js)
- [service-worker.js](../../../src/service-worker.js)
- [list-editor.test.js](../../../tests/unit/list-editor.test.js)
- [lists.spec.js](../../../tests/e2e/lists.spec.js)
- [requirements.md](../../../docs/requirements.md)
- [CHANGELOG.md](../../../CHANGELOG.md)
- [package.json](../../../package.json)

Size estimate: 10 files, 300 lines
Size note: Shared validation, release metadata, and documentation support one creation flow and remain independently mergeable together.
Mechanical command: `npm version 0.1.3-pre --no-git-tag-version` updates the package manifest and generated lockfile.
Mechanical command: `node scripts/check-sw-version.mjs --update` refreshes generated precache hashes.

### Tests
- Unit: draft changes and closing with a valid name create nothing.
- Unit: Create and Enter persist drafts; repeated submission creates only one list.
- Unit: empty names, case-insensitive duplicates, recycled duplicates, and overlong descriptions disable Create.
- Unit: fields lock during a deferred write and unlock afterward; existing lists still save on change.
- Integration: open New list, enter a valid draft, and close with Escape or the close button; no list appears.
- Integration: Create persists the name and description; keyboard Enter also creates a list.
- Integration: clicking Create after editing the description survives blur validation and persists the draft.

Completion check: `npm test` and `npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js`
