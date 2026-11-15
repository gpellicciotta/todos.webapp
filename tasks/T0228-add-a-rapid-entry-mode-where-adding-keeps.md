---
id: T0228
owner: "@claude"
session: claude-20261115-c362c7
needs: []
branch: task/T0228-add-a-rapid-entry-mode-where-adding-keeps
worktree: .plan/work/T0228-add-a-rapid-entry-mode-where-adding-keeps
status: active
started_at: "2026-11-15T08:15:25Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 3174.8, input: 548, output: 135978, cache_read: 36460376, cache_write: 468950}
work_duration: 26088.5
---
# T0228: Let Enter add by default, keep focus in the add field, and open the editor unfocused only on wide screens.

## Goals
Let users type many tasks in a row, such as a grocery list, without extra steps per task.
- Enter in the add field adds the typed task by default; Shift+Enter and Alt+Enter keep adding.
- A Make Enter add switch in Settings turns Enter adding off; the device remembers it.
- Every add keeps the focus in the add field.
- Wide screens open the new task's editor unfocused; compact screens open no editor.
- Search while typing keeps working.
- Motivation: [comparing-with-google-products.md](https://github.com/gpellicciotta/todos.server/blob/main/docs/comparing-with-google-products.md), section Capture.

Completion check: `npm test` and the all-tasks and list e2e specs pass.
Size estimate: 8 files, 250 lines.
Size note: Enter's new default touched existing specs, Settings, docs, the gallery, and wireframes; splitting would leave docs or tests out of date.

## Task Execution Steps
- [x] **[Read]**      Read the add bar code and the decided add rules in ui-design.md, requirements VO-3 and TSK-13.
- [x] **[Decide]**    Ask the user where the mode toggle lives, add bar or Settings, since it revises decided rules.
- [x] **[Implement]** Author failing unit and e2e tests for Enter adding, kept focus, and no editor in the mode.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement the mode, its toggle, and its stored preference.
- [x] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [x] **[Visual]**    Inspect the add bar in both modes at 390 px and 1440 px, in both themes.
- [x] **[Doc]**       Update VO-3, TSK-13, the Add Bar and Search and Add designs, wireframes, and CHANGELOG.md.
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

- [2026-11-15] **[Decided]**
  User made Enter add by default with a Make Enter add Settings switch; compact adds skip the editor, wide adds open it unfocused.

- [2026-11-15] **[Verify]**
  Red phase: new tests fail because Enter does not add and the preference, switch, and compact rule are missing.
  - Unit: 13 failed, 98 passed.
  - E2E all-tasks and list: 4 failed, 36 passed.

- [2026-11-15] **[Verify]**
  Unit suite and full e2e suite pass; lint is clean. One serve.test.js pid-file timing failure passed on rerun, unrelated to this task.
  - npm test: 1246 passed.
  - playwright: 206 passed.

- [2026-11-15] **[Implement]**
  Enter adds by default via todos.enter-adds; Settings gained an Adding tasks section with the Make Enter add switch. Compact adds skip the editor; each new row is highlighted and announced.

- [2026-11-15] **[Visual]**
  Before and after screenshots at 390 and 1440 px in light and dark show the highlighted new row, no compact editor, and the Settings switch.
  - Screenshots: screenshots/ linked from validation-proof.md.
  - No console errors or failed requests.

- [2026-11-15] **[Doc]**
  Updated VO-3, TSK-13, the Add Bar, Search and Add, and Settings designs, the settings wireframe, gallery, style guide, and CHANGELOG.md.

- [2026-11-15] **[Verify]**
  Size note: 20 counted files and 529 lines exceed the typical and large lines; Enter's new default touched existing specs, Settings, docs, and wireframes.
  - Files touched: 20.
  - Lines touched: 529.
  - Reopenings: 0.

- [2026-11-15] **[Verify]**
  Rebased onto main after T0224, resolved CHANGELOG, requirements, and service worker conflicts, and moved the new test and gallery row to the ready status.
  - npm test: 1299 passed.
  - playwright: 206 passed.

