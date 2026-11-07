### Decisions
- **[Decided]** Groupings: None (default), List, Due Date, Status. A task in several lists appears under each of them.
- **[Decided]** Due Date buckets: Overdue, Today, Tomorrow, This week, Later, No due date. Bucket order is fixed.
- **[Decided]** Status buckets follow the status order: To do, In progress, Completed, Cancelled.
- **[Decided]** List groups follow the list order; tasks in no list go under "No list" last.
- **[Decided]** Empty groups are hidden. Headers do not take part in selection or task reorder.
- Headers count as rows of the virtualized list; the 200 ms open budget with 5000 tasks must still hold.
- The control form comes from T0051; this task only wires it.

### Declared Files
- src/js/core/query.js
- src/js/core/preferences.js
- src/js/views/all-tasks.js
- src/js/views/task-list.js
- src/js/views/view-controls.js
- src/css/views.css
- tests/unit/query.test.js
- tests/unit/all-tasks.test.js
- tests/e2e/all-tasks.spec.js
- docs/requirements.md
- CHANGELOG.md

Size estimate: 11 files, 420 lines
Size note: The grouping model, its headers, and its control cannot merge separately; the control design is split off in T0051.

### Tests
- Unit: `groupTasks` by status returns ordered buckets and hides empty ones.
- Unit: by due date it assigns Overdue, Today, Tomorrow, This week, Later, and No due date from a fixed clock.
- Unit: by list it repeats a multi-list task and puts list-less tasks under "No list" last.
- Unit: filters and sort apply inside each group; the choice round-trips through preferences.
- Integration: Playwright groups All tasks by each option, checks headers and counts, and reloads to confirm persistence.
- Integration: with 5000 tasks grouped by list, the view opens within 200 ms under 4x CPU throttling.

Completion check: npm test && npx playwright test tests/e2e/all-tasks.spec.js && npm run test:perf
