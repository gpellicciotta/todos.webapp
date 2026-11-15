---
id: T0225
owner: "@claude"
session: claude-20261115-09d5df
needs: []
branch: task/T0225-complete-a-task-with-one-click-on-its
worktree: .plan/work/T0225-complete-a-task-with-one-click-on-its
status: active
started_at: "2026-11-15T00:47:40Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 3111.4, input: 424, output: 134504, cache_read: 32504060, cache_write: 413654}
  review: {turns: 2, duration_s: 864.8, input: 400968, output: 42604, cache_read: 7035968}
review_status: pending
review_round: 2
review_requested_at: "2026-11-15T01:21:34Z"
review_session: antigravity-20261115-b62b32
work_duration: 1437.5
---
# T0225: Complete a task with one click on its status button, keeping the full status menu one step away

## Goals
Make completing a task, the most frequent action, take one click instead of two.
- A click on the status button of `todo` or `in-progress` sets `completed`; on `completed` or `cancelled` it sets `todo`.
- The full status menu stays one step away, and the task editor keeps its status control.
- The `x` key toggles completion of the focused row.
- A completion that hides the row shows a toast with Undo.
- Motivation: [comparing-with-google-products.md](https://github.com/gpellicciotta/todos.server/blob/main/docs/comparing-with-google-products.md), section Completing Work.

Completion check: `npm run test:unit` and the list and all-tasks e2e specs pass.
Size estimate: 8 files, 300 lines.

## Task Execution Steps
- [x] **[Read]**      Read the task row, status menu, toast, and shortcut code, and requirements TSK-4 and SHR-4.
- [x] **[Decide]**    Decide how the full status menu opens: context menu and long press, or a small chevron button.
- [x] **[Implement]** Author failing unit and e2e tests for click toggling, the menu path, the shortcut, and Undo.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Implement click toggling, the menu path, the `x` shortcut, and the Undo toast.
- [x] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [x] **[Visual]**    Inspect rows at 390 px and 1440 px, in both themes, by mouse, touch, and keyboard.
- [x] **[Doc]**       Update TSK-4, the Task Row design, the shortcut list, the wireframes, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-12] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-12] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the Google products comparison in todos.server.

- [2026-11-15] **[Decided]**
  Menu opens by right-click, long press, Down, Up, Shift+F10, or the Menu key; no chevron. The task editor status control is the visible alternative.
  - Compact rows already hide More, so a chevron would crowd 390 px rows.
  - Undo toast covers every row status change that hides the row.

- [2026-11-15] **[Implement]**
  Implemented click toggling, the right-click, long press, and key paths to the menu, the x shortcut, and the Undo toast.
  - Size note: 15 files, 615 lines; one concern, mostly tests.
  - Undeclared files are listed in technical-spec.md.

- [2026-11-15] **[Verify]**
  Unit suite, full e2e suite, lint, and wireframe tests passed; see validation-proof.md.
  - npm test: 1196 passed.
  - playwright: 203 passed.

- [2026-11-15] **[Visual]**
  Captured rows at 390 and 1440 px in both themes by hover, focus, long press, and click, with zero console errors.
  - Screenshots are linked in validation-proof.md.

- [2026-11-15] **[Doc]**
  Updated TSK-4, the Task Row design, the shortcut lists, the All tasks wireframe, the gallery, and CHANGELOG.md.

- [2026-11-15] **[Verify]**
  Recorded task outcomes.
  - Files touched: 15.
  - Lines touched: 615.
  - Reopenings: 0.

- [2026-11-15] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-15] **[Review]**
  Round 1 rejected by @gemini: One-click completion, status menu paths, the `x` shortcut, Undo toasts, and tests work well (`npm test` and Playwright pass).
  - Findings: [review-findings-1.md](T0225-complete-a-task-with-one-click-on-its/review-findings-1.md).

- [2026-11-15] **[Implement]**
  Addressed review round 1: bumped the service worker VERSION, regenerated the precache manifest, and updated the visual style guide Status button entry.
  - Size note: 17 counted files, 622 lines; manifest is mechanical.

- [2026-11-15] **[Verify]**
  check:sw, design check, unit, lint, pytest, and the full e2e suite passed; one unrelated connect flake passed on rerun.
  - Evidence in validation-proof.md, Review Round 1 Rework.

- [2026-11-15] **[Verify]**
  Recorded task outcomes.
  - Files touched: 17.
  - Lines touched: 622.
  - Reopenings: 0.

- [2026-11-15] **[Review]**
  Round 2 requested (mode: agent).

