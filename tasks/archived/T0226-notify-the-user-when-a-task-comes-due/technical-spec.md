## Technical Specifications

### Declared Files
- src/js/app.js
- src/js/core/preferences.js
- src/js/views/settings.js
- src/service-worker.js
- tests/unit/settings.test.js
- tests/unit/service-worker.test.js
- docs/requirements.md
- docs/specs/ui-design.md
- New, not counted: src/js/core/reminders.js, tests/unit/reminders.test.js, tests/e2e/reminders.spec.js.

### Requirements
- Reminders are off by default; turning them on calls `Notification.requestPermission()` from the click.
- A denied or unsupported permission shows why reminders cannot work and leaves the switch off.
- Lead times: at due time, 5, 15, 30, or 60 minutes before; the device remembers the choice.
- Proposal for the Decide step: date-only tasks (due 23:59, `TSK-6`) notify at 09:00 on the due date, like Google Tasks.
- Proposal for the Decide step: on start, tasks that came due while closed show in one summary notification.
- Only open tasks (`todo`, `in-progress`) that are not deleted get reminders.
- Read the status and due time of the current occurrence through `statusOf` and `dueTimeOf` in `core/occurrences.js` (T0224, T0235).
- A recurring task reminds once per occurrence; rolling over to the next period arms the next occurrence's due time.
- An overdue task with handling `cancel` expires at its due time; a reminder that fires before then still applies.
- Tasks in shared lists get reminders too, since the user sees them.
- Only one tab schedules; reuse the single-tab coordination sync uses (`SYN-12`).
- Use `registration.showNotification()` with a `tag` of task id and due time, so repeats replace instead of stacking.
  Use the tag `task-due:{{task-id}}:{{due-time}}`, with the UTC due time, matching pushes from todos.server T0261.
- A notification click focuses an open app window, or opens one, at `#/tasks/{{task-id}}`.
- Timers re-arm after edits, sync pulls, imports, and a wake from sleep; never rely on one long `setTimeout`.
- Notification text: the task description and its due time in the device timezone (`TEC-14`).
- `TEC-16` still holds: scheduling 5000 tasks must not delay the first paint.

### Tests
- Unit: the scheduler picks the right fire time for each lead time and for date-only tasks.
- Unit: completing, deleting, or clearing the due time cancels a pending reminder; changing it re-arms.
- Unit: a due time already notified never notifies again after a reload.
- Unit: only the leader tab schedules.
- Unit: a weekly recurring task reminds for this week's occurrence, then re-arms for next week's after the roll-over.
- Integration: e2e grants a mocked permission, adds a task due in one minute with clock control, sees the notification, and clicks it to open the editor.

Completion check: `npm test` and the new reminders e2e spec pass.
