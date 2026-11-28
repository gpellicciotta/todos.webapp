# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [~] T0299 [owner: @claude] Specify ADR-0006 goals, logs, statuses, and backup format 3 in the local store and backup format specs.
- [ ] T0302 [needs: T0299] Port the ADR-0006 fold to the local occurrences module, passing the shared fold test vectors.
- [ ] T0303 [needs: T0302] Store ADR-0006 goals, start times, logs, and undos locally, migrating the database and local legacy events.
- [!] T0301 [reason: Waiting for the year recurrence vectors of todos.server T0298.] Support the year recurrence unit in local periods, with the year cases of the shared recurrence vectors.
- [!] T0304 [reason: Waiting for the log and undo-log REST events of todos.server T0301.] [needs: T0303] Sync ADR-0006 logs, undos, entries, and statuses with the service, keeping queued legacy events replayable.
- [ ] T0306 [needs: T0303] Rebuild the task editor as four tabs, with goals, recurrence, and start times on Configuration.
- [ ] T0307 [needs: T0306] Show progress, check off, a log form, and undoable entries on the task editor Status tab.
- [ ] T0305 [needs: T0303] Export ADR-0006 fields in backup format 3, and convert older backups on import.
- [ ] T0312 [needs: T0307] Show goal progress on task rows, with the quick log, Failed status, and upcoming tasks.
- [ ] T0268 Add the Reminders section to the settings wireframe and check real notifications in Chrome and Firefox.
- [!] T0227 [reason: Waiting for the push dispatch of todos.server T0261.] Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
- [ ] T0309 Write the welcome, getting started, and FAQ help docs in docs/tutorial as Markdown.
- [ ] T0310 [needs: T0309] Serve the help docs and the changelog under help/ locally and on Pages, cached for offline use.
- [ ] T0311 [needs: T0309, T0310] Add a Help screen to the user menu from the help docs, and drop Keyboard shortcuts and About from Settings.
- [x] T0308 Drop the non-clickable ToDo's logo and name from the sidebar.
- [x] T0300 Specify the ADR-0006 task editor sections, task row marks, and log form in the UI design and wireframes.

## Backlog
*(Currently no tasks)*
