## Technical Specifications
Design: [todos.server T0215 design](../../../../todos.server/.plan/tasks/T0215-specify-recurring-tasks-status-entries-and-the-task/technical-spec.md), sections "Periods", "Rule Edits", "Roll-Over and Deadlines", and "Late Events and the Grace Period".
Dependencies: T0224, todos.server T0221 (recurrence, grace, occurrences route), and todos.server T0219 (shared recurrence test vectors).

- **[Decided]** Local mode keeps recurring tasks (`LOC-2`), so the web app runs its own period math and roll-over.
- **[Decided]** `src/js/core/periods.js` computes periods for day, week, and month units with an interval and an IANA timezone.
  It uses `Intl`, ISO weeks, half-open periods, and local midnight starts, like the server.
- **[Decided]** `periods.test.js` runs every case of todos.server `docs/specs/recurrence-test-vectors.json`.
  The vectors are copied to `tests/fixtures/recurrence-test-vectors.json`, so the suite runs without the server repo.
  The copy is refreshed by hand whenever todos.server changes the vectors.
- **[Decided]** In local mode the app rolls tasks over on start and every minute, beside the overdue timer.
  Roll-over writes missed occurrences, `roll-over` and `end-recurrence` events, as the server does.
- **[Decided]** While connected, the app never rolls over itself; it applies the display rule until the server does.
  The display rule shows a recurring task past its period end as `ready` with count 0.
- **[Decided]** The editor edits unit, interval, end date, end count, and timezone, defaulting to the browser's zone.
- **[Decided]** During the 24-hour grace period, the row menu offers "Complete for previous period", naming the cached occurrence.
- **[Decided]** A history view lists events and occurrences, read online from the server routes, or from the local stores in local mode.

### Declared Files
- `src/js/core/occurrences.js`
- `src/js/store/tasks.js`
- `src/js/sync/api.js`
- `src/js/views/task-list.js`
- `src/js/views/task-editor.js`
- `src/js/app.js`
- `src/js/core/periods.js` (new)
- `src/js/views/task-history.js` (new)
- `tests/unit/occurrences.test.js`
- `tests/unit/task-list.test.js`
- `tests/unit/task-editor.test.js`
- `tests/unit/periods.test.js` (new)
- `tests/fixtures/recurrence-test-vectors.json` (new)
- `tests/e2e/task-editor.spec.js`
- `docs/requirements.md`
- `docs/specs/local-store.md`
- `docs/specs/ui-design.md`
- `CHANGELOG.md`

### Tests
- Unit: `periods.test.js` passes every shared vector, including ISO weeks and DST changes in `Europe/Brussels`.
- Unit: `occurrences.test.js` rolls a weekly task over missed periods and ends it at its end count with `end-recurrence`.
- Unit: `task-list.test.js` shows a connected recurring task past its period end as `ready 0/3` and offers grace completion.
- Integration: `task-editor.spec.js` sets a weekly recurrence in local mode, ticks it, and sees it come back as ready next period.

Size estimate: 12 files, 950 lines
Size note: Above the typical line because local roll-over, the rule editor, grace completion, and history share the occurrence model and cannot ship apart.
Completion check: `npm test && npm run test:contract && npm run test:e2e`
