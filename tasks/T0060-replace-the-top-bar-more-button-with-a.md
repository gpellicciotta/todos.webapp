---
id: T0060
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-06T12:59:19Z"
ended_at: "2026-11-06T13:11:30Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-subagent"
completion-commit: 87688fbcdb98acdc4d95a9e65a28b267f5fac1e2
---
# T0060: Replace the top-bar More button with a floating New list button in the Lists view

## Goals
Remove the top-bar More button, which only holds New list, and its menu.
Show New list in the Lists view as a floating button fixed at the bottom right of the screen, above the content, in both layouts.
On compact layouts it sits above the bottom bar; it hides while an editor is open.
Redraw the wireframes: no vertical dots in the top bar, the Lists screens with the floating button, and no stray dots in task-editor.svg.
Completion check: `npm test`, `npm run lint`, `npx playwright test`, `python -m pytest`, and `npm run check:sw`.

## Task Execution Steps
- [x] **[Read]**      Read layout.js, lists.js, the Lists screen design, and the layer tokens.
- [x] **[Implement]** Author unit and end-to-end tests for the floating button and the removed More button.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Remove More; add the .fab component, its shell placement, and the Lists view button.
- [x] **[Verify]**    Run unit, end-to-end, Python, lint, and service worker checks and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots of Lists on compact and wide layouts.
- [x] **[Doc]**       Update the gallery, style guide, UI design, wireframes, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-06] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-06] **[Implement]**
  Removed the shell More button; added the fab component, layer token, shell placement, and Lists button.
  - Also touched app.js, which was not declared.

- [2026-11-06] **[Size]**
  Size note: 19 counted files and 354 lines, above the typical line; one undeclared file, app.js.

- [2026-11-06] **[Decided]**
  Hid the floating button while an editor is open, so it never covers the editor panel.

- [2026-11-06] **[Decided]**
  The compact Edit view options entry of T0054 loses its top-bar More menu; its placement needs a decision.

- [2026-11-06] **[Verify]**
  Recorded task outcomes.
  - Files touched: 19.
  - Lines touched: 354.
  - Reopenings: 0.

- [2026-11-06] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-06] **[Review]**
  Independent review approved. Not fixed: toasts can cover the button on compact; compact Edit view options placement is open.

- [2026-11-06] **[Review]**
  Round 1 approved by @claude-subagent.

- [2026-11-06] **[Complete]**
  Task completed successfully.

