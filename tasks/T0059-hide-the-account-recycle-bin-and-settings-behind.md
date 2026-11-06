---
id: T0059
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-06T07:47:34Z"
ended_at: "2026-11-06T12:58:51Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 2
reviewed_by: "@claude-subagent"
completion-commit: 84039c358d47ce3e6f1108077406e3677e5b1084
---
# T0059: Hide the account, Recycle bin, and Settings behind a circular user button with a popover panel

## Goals
Put a circular user button at the top right of the main view, in both layouts. Its popover holds the user name, a Local only or Connected indication, Recycle bin, and Settings.
Local mode: hover reads "Local User". Connected: the button shows the account initials, and hover reads the account name.
Sign-in needed (expired session): a Sign in button joins the user button and opens the connect screen.
Move Recycle bin and Settings out of the sidebar and bottom bar, and remove the sync indicator from the shell for now.
Completion check: `npm test`, `npm run lint`, `npx playwright test`, and `npm run check:sw`.

## Task Execution Steps
- [x] **[Read]**      Read the shell, popover, session, and chrome CSS code, and the App Shell and Sync Indicator design.
- [x] **[Implement]** Author unit tests for the user menu states, plus end-to-end tests for both layouts.
- [x] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [x] **[Implement]** Add the user menu module, user icon, and styles; wire the session; remove the moved entries.
- [x] **[Verify]**    Run unit, end-to-end, lint, and service worker checks and confirm they pass.
- [x] **[Visual]**    Capture before and after screenshots on compact and wide layouts, in light and dark.
- [x] **[Doc]**       Update the gallery, style guide, UI design, wireframes, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-06] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-06] **[Implement]**
  Built the user menu, popover end alignment, shell changes, gallery section, wireframes, and docs.
  - Added user-menu.js and the user icon.
  - Bumped service worker VERSION to 2026-11-06.2.

- [2026-11-06] **[Verify]**
  Unit tests were proven red first. Wireframe tests were written after the script change, then proven red against the old script. End-to-end red run not captured.

- [2026-11-06] **[Decided]**
  Added a Sign in button beside the user button, so Recycle bin and Settings stay reachable when the session expires.

- [2026-11-06] **[Decided]**
  Fixed popover anchoring: it now takes the panel out of the flow before measuring the trigger, which the new end alignment exposed.

- [2026-11-06] **[Size]**
  Size note: undeclared files popover.js and test_draw_wireframes.py. Working diff is 19 counted files and 960 lines, under three times the estimate.

- [2026-11-06] **[Visual]**
  Screenshots stored in the task folder; see validation-proof.md for results of all suites.

- [2026-11-06] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-06] **[Review]**
  Independent subagent review found no blocking defects; fixed its aria, test, comment, and blank-name findings.
  - Not fixed: button face stays stale until click after timed expiry.

- [2026-11-06] **[Implement]**
  Restyled the panel links as secondary buttons with icons, per user feedback; wireframe now draws the icons.
  - Kept the button icon element stable across opens.

- [2026-11-06] **[Review]**
  Round 1 rejected by @claude-subagent: Bottom nav grid still has 4 columns for 2 items; anchorPanel measures the panel before setting left, so long names misalign it.

- [2026-11-06] **[Implement]**
  Fixed review round 2: bottom bar columns, panel measuring, panel width cap, and sign-in re-insertion.
  - End-to-end tests for both defects failed first.

- [2026-11-06] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-06] **[Size]**
  Size note: final diff is 20 counted files and 1128 lines, above the large line but under three times the estimate.

- [2026-11-06] **[Review]**
  Round 3 independent review approved; its panel width finding was fixed afterwards with a failing test first.

- [2026-11-06] **[Verify]**
  Recorded task outcomes.
  - Files touched: 20.
  - Lines touched: 1128.
  - Reopenings: 0.

- [2026-11-06] **[Review]**
  Round 2 approved by @claude-subagent.

- [2026-11-06] **[Complete]**
  Task completed successfully.

