---
id: T0250
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0250: Let task lists, the Lists screen, and the Recycle Bin fill the main area's width instead of a 45rem column

## Goals
Stop cutting off task descriptions and list names while the screen has room to show them.
- Cause: `.app__view` caps every view at `--width-main` (45rem) in views.css, and rows end in an ellipsis.
- All tasks, a list, the Lists screen, and the Recycle Bin fill the main area, with the usual side gutters.
- The add block in the action bar follows the width of the view above it.
- Settings, the Sync log, and dialogs keep the 45rem reading column.
- The user rated this the most important of the visual fixes.
- Rules and tests: [technical-spec.md](T0250-let-task-lists-the-lists-screen-and-the/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the width rules in views.css, app-components.css, and the vendored shell.css.
- [ ] **[Implement]** Author a failing e2e check that rows fill the main area at 1440 px, but Settings does not.
- [ ] **[Verify]**    Run the new check and confirm it fails for the right reason.
- [ ] **[Implement]** Scope the width cap to the reading views and let the row views fill the main area.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Capture before and after at 1024, 1440, and 1920 px, with and without the editor panel open.
- [ ] **[Doc]**       Update the UI design, the visual style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's report of cut-off rows.
