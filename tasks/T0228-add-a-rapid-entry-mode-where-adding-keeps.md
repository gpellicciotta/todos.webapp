---
id: T0228
owner: "@claude"
session: claude-20261115-c362c7
needs: []
branch: task/T0228-add-a-rapid-entry-mode-where-adding-keeps
worktree: .plan/work/T0228-add-a-rapid-entry-mode-where-adding-keeps
status: suspended
started_at: "2026-11-15T01:26:39Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0228: Add a rapid entry mode where adding keeps focus in the field and skips the task editor

## Goals
Let users type many tasks in a row, such as a grocery list, without extra steps per task.
- A Rapid entry mode makes Enter add the typed task and keep focus in the add field.
- In this mode an add does not open the task editor, also on compact layouts.
- Search while typing keeps working; only Enter's meaning changes.
- The device remembers the mode; it is off by default.
- Motivation: [comparing-with-google-products.md](https://github.com/gpellicciotta/todos.server/blob/main/docs/comparing-with-google-products.md), section Capture.

Completion check: `npm run test:unit` and the all-tasks and list e2e specs pass.
Size estimate: 8 files, 250 lines.

## Task Execution Steps
- [x] **[Read]**      Read the add bar code and the decided add rules in ui-design.md, requirements VO-3 and TSK-13.
- [ ] **[Decide]**    Ask the user where the mode toggle lives, add bar or Settings, since it revises decided rules.
- [ ] **[Implement]** Author failing unit and e2e tests for Enter adding, kept focus, and no editor in the mode.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the mode, its toggle, and its stored preference.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Inspect the add bar in both modes at 390 px and 1440 px, in both themes.
- [ ] **[Doc]**       Update VO-3, TSK-13, the Add Bar and Search and Add designs, wireframes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-12] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-12] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the Google products comparison in todos.server.

- [2026-11-15] **[Read]**
  Read add-bar.js, preferences.js, the Settings sections, VO-3, TSK-13, and the Add Bar and Search and Add designs.

- [2026-11-15] **[Decide]**
  Needs user choice: Rapid entry toggle in the add bar, or a Settings switch. Recommended Settings, beside Theme, keeping the 390 px add bar uncluttered.
  - Option A: add bar toggle, quick per-session switching.
  - Option B: Settings switch, device preference.

