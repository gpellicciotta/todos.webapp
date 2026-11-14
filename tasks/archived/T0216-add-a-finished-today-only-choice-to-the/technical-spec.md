## Technical Specifications

### Background
- The Status filter offers To do, In progress, Completed, and Cancelled (`TV-3`).
- Checking Completed or Cancelled shows every finished task, however old.
- Tasks store no completion time; they store `creation-time`, `last-update-time`, and `last-activity-time` (`TSK-12`).

### Decisions
- **[Decided]** The user chose `last-update-time` as the finish time; no schema, backup, or sync change.
  - It changes with status, description, due time, and overdue handling edits, and with binning and restoring.
  - It does not change with notes or list membership changes.
  - So editing an old finished task today also counts it as finished today; the user accepted this.
- **[Decided]** The user chose a modifier checkbox, "Finished today only", below the four status checkboxes.
  - It is not a fifth status; it narrows the checked Completed and Cancelled statuses.
  - All four statuses plus the choice show open tasks and the work finished today.

### Behavior
- Filter key: `finishedToday: true`; the key is absent when off.
- `filterTasks`: with `finishedToday`, a `completed` or `cancelled` task matches only when its `last-update-time` is in today's local window.
  - Today's window is the half-open local day `[midnight, next midnight)`, from `ctx.now`, as for the Due filter.
  - `todo` and `in-progress` tasks pass this test unchanged; the status filter still applies with AND (`TV-8`).
  - An empty status filter (every status) with the choice shows open tasks and today's finished tasks.
- `clearFilters(filter, ['statuses'])` also removes `finishedToday`, since it belongs to the Status filter.
- `hidingFilters` ignores the choice: a new task is open, so it never hides one.
- View state:
  - `sanitizeViewState` keeps `finishedToday` only when it is `true`; `saveViewState` stores it per view (`TV-12`).
  - `isDefaultViewState` is false while the choice is on, so Reset shows and clears it (`VO-8`).
  - The default state leaves it off.
- Text (`VO-7`):
  - The status value gains `, finished today`: `Status: 4 statuses, finished today`, `Status: completed, finished today`.
  - An empty status filter with the choice reads `Status: all, finished today`, also in empty-result messages.
  - The panel's Status row shows the same value.
- Panel:
  - A checkbox labeled "Finished today only" follows the four statuses in the Status region.
  - It uses `data-toggle="finishedToday"`, not `data-filter`, so the array logic of status checkboxes stays apart.
  - Changes apply at once and announce the count, as every other control (`VO-13`).
- Clock: All tasks and the list view render again on each clock tick while the choice is on.
  - So yesterday's finished tasks leave the view after midnight without a reload.
  - All tasks already does this for the Due filter and due grouping; the list view only refreshes chips today.

### Declared Files
- src/js/core/query.js
- src/js/views/view-controls.js
- src/js/views/all-tasks.js
- src/js/views/list.js
- src/service-worker.js
- tests/unit/query.test.js
- tests/unit/view-controls.test.js
- tests/unit/all-tasks.test.js
- tests/unit/list.test.js
- tests/e2e/all-tasks.spec.js
- docs/requirements.md
- docs/specs/ui-design.md
- CHANGELOG.md

Mechanical command: node scripts/check-sw-version.mjs --update (after the VERSION bump in src/service-worker.js)

Size estimate: 13 files, 320 lines

Size note: 13 files, above the typical line; one filter spans the query, the panel, both screens' clocks, and docs.
Splitting off the clock follow would leave a mergeable step that shows stale results after midnight, so it stays one task.

### Tests
- Unit: `filterTasks` with `finishedToday` keeps open tasks and tasks finished today, and drops tasks finished yesterday.
- Unit: the window follows local midnight: 23:59:59.999 yesterday is out, 00:00 today is in.
- Unit: `finishedToday` with statuses `['completed']` shows only today's completed tasks; with no statuses, all open ones too.
- Unit: `clearFilters(filter, ['statuses'])` resets statuses to open and removes `finishedToday`.
- Unit: `sanitizeViewState` keeps `true` and drops other values; the flag round-trips through storage.
- Unit: `isDefaultViewState` is false with the flag; `describeInfoLine` and `describeFilters` name it as specified.
- Unit: the panel shows the checkbox in the Status region; checking and unchecking sets and removes the flag and updates the row value.
- Unit: All tasks and the list view render again on a clock tick while the flag is on, dropping a task finished yesterday.
- Integration: Playwright, All tasks: seed tasks finished today and yesterday; check all statuses and the choice.
  The rows show open tasks and today's finished tasks only; the info line names the choice; it survives a reload; Reset clears it.

Completion check: npx vitest run && npx playwright test tests/e2e/all-tasks.spec.js tests/e2e/list.spec.js && npx eslint . && npm run check:sw
