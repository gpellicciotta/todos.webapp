# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [~] T0313 [owner: @claude] Add goals, start times, progress, and time spent to local records in database version 6.
- [ ] T0314 [needs: T0313] Convert local completions to log events in the upgrade, and store logs and undos.
- [ ] T0315 [needs: T0314] Place local events by start time, expire tasks by goal, and filter failed and upcoming tasks.
- [ ] T0301 Support the year recurrence unit in local periods, with the year cases of the shared recurrence vectors.
- [!] T0304 [reason: Waiting for the log and undo-log REST events of todos.server T0301.] [needs: T0315] Sync ADR-0006 logs, undos, entries, and statuses with the service, keeping queued legacy events replayable.
- [ ] T0306 [needs: T0315] Rebuild the task editor as four tabs, with goals, recurrence, and start times on Configuration.
- [ ] T0307 [needs: T0306] Show progress, check off, a log form, and undoable entries on the task editor Status tab.
- [ ] T0305 [needs: T0315] Export ADR-0006 fields in backup format 3, and convert older backups on import.
- [ ] T0312 [needs: T0307] Show goal progress on task rows, with the quick log, Failed status, and upcoming tasks.
- [ ] T0316 [needs: T0304, T0305, T0312] Remove the legacy target-count and completion-count fields once every reader uses goals and progress.
- [!] T0227 [reason: Waiting for the push dispatch of todos.server T0261.] Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
- [x] T0310 Serve the help docs and the changelog under help/ locally and on Pages, cached for offline use.
- [ ] T0311 Add a Help screen to the user menu from the help docs, and drop Keyboard shortcuts and About from Settings.
- [x] T0299 Specify ADR-0006 goals, logs, statuses, and backup format 3 in the local store and backup format specs.
- [x] T0302 Port the ADR-0006 fold to the local occurrences module, passing the shared fold test vectors.
- [-] T0303 [reason: Split into T0313, T0314, T0315, and T0316 to stay under the large size line.] Store ADR-0006 goals, start times, logs, and undos locally, migrating the database and local legacy events.
- [x] T0268 Add the Reminders section to the settings wireframe and check real notifications in Chrome and Firefox.
- [x] T0309 Write the welcome, getting started, and FAQ help docs in docs/tutorial as Markdown.
- [x] T0308 Drop the non-clickable ToDo's logo and name from the sidebar.
- [x] T0300 Specify the ADR-0006 task editor sections, task row marks, and log form in the UI design and wireframes.

## Backlog
*(Currently no tasks)*
