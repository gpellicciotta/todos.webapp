# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [!] T0224 [reason: circuit breaker: 3 consecutive completion refusals ("Cannot complete task 'T0224': rebasing branch 'task/T0224-adopt-task-entries-status-entries-recurring-tasks-and' onto 'main' conflicts in src/css/app-components.css, src/demo/visual-style-gallery.html, src/js/views/task-list.js, CHANGELOG.md, docs/requirements.md, scripts/sw-precache-hashes.json, src/service-worker.js. The rebase was aborted and mainline was left untouched. Resolve the conflict on the task branch in 'C:\Dev-Projects\todos.webapp\.plan\work\T0224-adopt-task-entries-status-entries-recurring-tasks-and' (for example with 'git merge main'), commit the result, and rerun 'plan tasks stop'.")] [owner: @claude] Adopt the todos.server lifecycle rules, occurrences, and events in the web app store and sync.
- [ ] T0234 [needs: T0224] Show event actions, done and target counts, and lifecycle rule editing in the web app task views.
- [ ] T0235 [needs: T0224] Support recurring tasks in the web app, with local period math, a rule editor, grace completion, and history.
- [ ] T0236 [needs: T0224] Write backup format 2 with lifecycle rules, occurrences, and events, keeping format 1 importable.
- [!] T0237 [reason: blocked: needs T0224 occurrences in the store and T0235 task history view] [needs: T0224, T0235] [owner: @claude] Show task notes on their occurrence, and let users keep a note global or tie it to an occurrence.
- [x] T0225 Complete a task with one click on its status button, keeping the full status menu one step away.
- [ ] T0228 [owner: @claude] Let Enter add by default, keep focus in the add field, and open the editor unfocused only on wide screens.
- [x] T0229 Parse due dates, times, and list tags typed in the add field into the new task.
- [x] T0223 Improve task group headers with more padding, an 'n of m' count, and collapsible groups.

## Backlog
- [ ] T0227 [needs: T0226] Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
- [ ] T0226 Notify the user when a task comes due while the app is open, with opt-in and a lead time.
- [ ] T0222 Name the Shared filter in the hidden-task toast and let Show clear it.
- [ ] T0221 Prune Lists filter ids of deleted lists before the All tasks hidden-task toast, which now reads 'Task added. hides it.'
- [ ] T0218 Evaluate adopting DevopsCli from the released support-python v2.0.0, keeping project-specific actions through add_action.
- [ ] T0070 Make throttled scrolling smoother by cutting the work per entering row in long lists.
- [ ] T0072 Make the sidebar scroll only its lists, keep the current list in view, and patch rows in place.
- [ ] T0073 [needs: T0072] Add the find field, roving focus, and the l shortcut to the sidebar lists.
- [ ] T0074 Add the find bar, sort menu, info line, and Create list offer to the Lists screen.
- [ ] T0075 [needs: T0074] Render long Lists screens with content-visibility and lazy row menus, with roving focus between rows.
- [ ] T0076 [needs: T0072, T0074] Add Move to top and Move to bottom to the Lists screen menu and Alt+Shift+arrow keys in both list surfaces.
- [ ] T0077 [needs: T0073, T0075] Add a 150-list render check to the performance spec, and record 500 lists.
- [ ] T0078 [needs: T0074] Add the Shared only filter to the Lists screen sort menu while connected.
- [ ] T0217 Show the Finished today only choice in the view options wireframe and the visual style gallery sample.
- [ ] T0220 Make the gallery keyboard-stop focus ring tests fast enough to pass under parallel load.
