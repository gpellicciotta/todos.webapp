# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [x] T0306 Rebuild the task editor as four tabs, with goals, recurrence, and start times on Configuration.
- [ ] T0318 Fix the end-to-end tests that fail on main since the ADR-0006 local store changes.
- [ ] T0304 Sync ADR-0006 logs, undos, entries, and statuses with the service, keeping queued legacy events replayable.
- [ ] T0307 Show progress, check off, a log form, and undoable entries on the task editor Status tab.
- [ ] T0305 Export ADR-0006 fields in backup format 3, and convert older backups on import.
- [ ] T0312 [needs: T0307] Show goal progress on task rows, with the quick log, Failed status, and upcoming tasks.
- [ ] T0316 [needs: T0304, T0305, T0312] Remove the legacy target-count and completion-count fields once every reader uses goals and progress.
- [x] T0315 Place local events by start time, expire tasks by goal, and filter failed and upcoming tasks.
- [x] T0227 Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
- [x] T0313 Add goals, start times, progress, and time spent to local records in database version 6.
- [x] T0314 Convert local completions to log events in the upgrade, and store logs and undos.
- [x] T0301 Support the year recurrence unit in local periods, with the year cases of the shared recurrence vectors.
- [x] T0310 Serve the help docs and the changelog under help/ locally and on Pages, cached for offline use.
- [x] T0311 Add a Help screen to the user menu from the help docs, and drop Keyboard shortcuts and About from Settings.
- [x] T0299 Specify ADR-0006 goals, logs, statuses, and backup format 3 in the local store and backup format specs.
- [x] T0302 Port the ADR-0006 fold to the local occurrences module, passing the shared fold test vectors.
- [-] T0303 [reason: Split into T0313, T0314, T0315, and T0316 to stay under the large size line.] Store ADR-0006 goals, start times, logs, and undos locally, migrating the database and local legacy events.
- [x] T0268 Add the Reminders section to the settings wireframe and check real notifications in Chrome and Firefox.
- [x] T0309 Write the welcome, getting started, and FAQ help docs in docs/tutorial as Markdown.
- [x] T0308 Drop the non-clickable ToDo's logo and name from the sidebar.
- [x] T0300 Specify the ADR-0006 task editor sections, task row marks, and log form in the UI design and wireframes.

## Backlog
- [!] T0317 [reason: Needs the user's Android phone after the release is deployed.] Inspect a pushed reminder on an installed Android PWA after the release.
