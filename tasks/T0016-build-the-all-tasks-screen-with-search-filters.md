---
id: T0016
owner: "@claude-code"
needs: ['T0037']
branch: —
worktree: —
status: active
started_at: "2026-11-04T16:27:05Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0016: Build the All tasks screen with search, filters, sort, the add bar, the status menu, and the empty state

## Goals
Build All tasks per docs/specs/ui-design.md and its wireframes all-tasks.svg and first-launch.svg.
Add search, the Lists, Status, Due, and Created filters, and the sort menu (`TV-1` to `TV-12`).
Add the add bar and the status menu on each row (`TSK-1`, `TSK-4`).
Show the first-launch empty state and ask for persistent storage after the first task (`LOC-1`, `TEC-5`).
Split on 2026-11-04 for size: follow-ups to T0035, rows and add bar to T0036, controls to T0037.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's All Tasks screen, Task Row, Add Bar, and View Controls sections.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write the All tasks view, the shared task list and controls, and the add bar.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Update ui-design.md where the build differs and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

- [2026-11-04] **[Implement]**
  Built All tasks with shared task rows, status and More menus, view controls, the add bar, and empty states; applied the review follow-ups.
  - Added src/js/core/preferences.js for T0020 to reuse.
  - Added src/css/views.css and bumped the service worker VERSION.

- [2026-11-04] **[Verify]**
  Recorded red and green runs in validation-proof.md; unit, lint, end-to-end, and service worker checks pass.
  - 517 unit tests and 81 end-to-end tests passed.

- [2026-11-04] **[Visual]**
  Compared before and after at 390 and 1440 px in both themes, then fixed the wide controls rows and the Filters panel height.
  - Before: [1440 light](T0016-build-the-all-tasks-screen-with-search-filters/screenshots/all-tasks-1440-light-before.png).
  - After: [1440 light](T0016-build-the-all-tasks-screen-with-search-filters/screenshots/all-tasks-1440-light-after.png).

- [2026-11-04] **[Verify]**
  Size note: the diff reached about 2580 counted lines in 26 files, above the large line and three times the estimate; a human sign-off or a split is needed.

