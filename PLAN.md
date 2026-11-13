# Project Planning
An overview of all tasks and their planning, possibly split by milestone.

## Next Milestone
- [x] T0230 Vendor the support.webapp design system with the neutral look and apply its token renames, losslessly.
- [x] T0231 Move the app layout onto the vendored shell.css, with the action bar, side panel, and overlay layer.
- [x] T0233 Replace the app's shared components with the vendored ones and import the public neutral look entry point.

## Backlog
- [ ] T0236 [needs: T0224] Write backup format 2 with lifecycle rules, occurrences, and events, keeping format 1 importable.
- [ ] T0235 [needs: T0224] Support recurring tasks in the web app, with local period math, a rule editor, grace completion, and history.
- [ ] T0234 [needs: T0224] Show event actions, done and target counts, and lifecycle rule editing in the web app task views.
- [~] T0232 [owner: @claude] Give the two gallery focus ring tab-through tests a longer timeout, since full parallel runs can exceed 30 seconds.
- [ ] T0229 Parse due dates, times, and list tags typed in the add field into the new task.
- [ ] T0228 Add a rapid entry mode where adding keeps focus in the field and skips the task editor.
- [ ] T0227 [needs: T0226] Deliver due reminders with the app closed through Web Push while connected, once the service sends them.
- [ ] T0226 Notify the user when a task comes due while the app is open, with opt-in and a lead time.
- [ ] T0225 Complete a task with one click on its status button, keeping the full status menu one step away.
- [ ] T0224 Adopt the todos.server lifecycle rules, occurrences, and events in the web app store and sync.
- [ ] T0223 Improve task group headers with more padding, an 'n of m' count, and collapsible groups.
- [ ] T0222 Name the Shared filter in the hidden-task toast and let Show clear it.
- [ ] T0221 Prune Lists filter ids of deleted lists before the All tasks hidden-task toast, which now reads 'Task added. hides it.'
- [ ] T0218 Evaluate adopting DevopsCli from the released support-python v2.0.0, keeping project-specific actions through add_action.
- [x] T0080 Fix the flaky connect e2e test: the first sync pull adds a second GET /api/users/me to the recorded calls.
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
