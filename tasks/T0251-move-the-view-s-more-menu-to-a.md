---
id: T0251
owner: "@claude"
session: claude-20261117-c9e73b
needs: []
branch: task/T0251-move-the-view-s-more-menu-to-a
worktree: .plan/work/T0251-move-the-view-s-more-menu-to-a
status: completed
started_at: "2026-11-17T00:03:41Z"
ended_at: "2026-11-17T00:27:32Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 815.5, input: 94, output: 27309, cache_read: 4558662, cache_write: 116547}
  review: {turns: 1, duration_s: 594.3, input: 219964, output: 16190, cache_read: 4148666}
review_status: approved
review_round: 1
review_requested_at: "2026-11-17T00:17:29Z"
reviewed_by: "@gemini"
review_session: antigravity-20261117-3f3961
work_duration: 1429.8
completion-commit: d4593421cc7d676cd95d30244a1f502ab59a7512
---
# T0251: Move the view's More menu to a vertical three-dot button beside the account button in the desktop header

## Goals
Move each view's actions to one place in the header on desktop, as the Google Cloud console does.
- A vertical three-dot button sits just before the account button in the top bar.
- It opens the current view's menu: Edit view options in All tasks; Edit list, view options, Share, and Delete in a list.
- Views without actions hide the button; compact layouts keep today's placement.
- Row menus of tasks, lists, and notes stay where they are.
- Rules and tests: [technical-spec.md](T0251-move-the-view-s-more-menu-to-a/technical-spec.md).

## Task Execution Steps
- [x] **[Read]**      Read the More menus in all-tasks.js and list-actions.js, and the top bar in layout.js.
- [x] **[Doc]**       Update the UI design for the header menu and redraw the affected wireframes.
- [x] **[Implement]** Author failing unit tests for the header button, its menu per view, and the compact fallback.
- [x] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [x] **[Implement]** Add the header slot and the icon, and move both view menus into it on wide layouts.
- [x] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [x] **[Visual]**    Capture the header in All tasks and a list, light and dark, at desktop and phone widths.
- [x] **[Doc]**       Update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's request for a header kebab menu.

- [2026-11-17] **[Implement]**
  Added view-actions.js, a shell actions slot, and a more-vertical icon; both views move their menu there from 64rem.

- [2026-11-17] **[Verify]**
  Unit, e2e, lint, pytest, and SW checks pass; screenshots saved.
  - Files touched: 18.
  - Lines touched: 236.
  - Reopenings: 0.

- [2026-11-17] **[Read]**
  Read the More menus of both views and the top bar in layout.js.

- [2026-11-17] **[Doc]**
  Updated ui-design.md and draw-wireframes.py, and regenerated the wireframes.

- [2026-11-17] **[Implement]**
  Authored failing unit tests for the slot, both menus, and the compact fallback.

- [2026-11-17] **[Verify]**
  Confirmed the new tests failed: 7 failed before the implementation.

- [2026-11-17] **[Visual]**
  Captured All tasks and a list, light and dark, at 1440 and 390 px.

- [2026-11-17] **[Doc]**
  Added the CHANGELOG.md bullet under v0.5.1-pre.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-17] **[Review]**
  Round 1 approved by @gemini: Approved.
  - Findings: [review-findings-1.md](T0251-move-the-view-s-more-menu-to-a/review-findings-1.md).

- [2026-11-17] **[Complete]**
  Task completed successfully.

## Screenshots
- Before, desktop: [before-all-tasks-desktop-light.png](T0251-move-the-view-s-more-menu-to-a/before-all-tasks-desktop-light.png)
- Before, phone: [before-all-tasks-phone-light.png](T0251-move-the-view-s-more-menu-to-a/before-all-tasks-phone-light.png)
- After, desktop: [after-all-tasks-desktop-light.png](T0251-move-the-view-s-more-menu-to-a/after-all-tasks-desktop-light.png), [dark](T0251-move-the-view-s-more-menu-to-a/after-all-tasks-desktop-dark.png)
- After, phone: [after-all-tasks-phone-light.png](T0251-move-the-view-s-more-menu-to-a/after-all-tasks-phone-light.png), [dark](T0251-move-the-view-s-more-menu-to-a/after-all-tasks-phone-dark.png)
- After, list menu: [desktop](T0251-move-the-view-s-more-menu-to-a/after-list-menu-desktop-light.png), [phone](T0251-move-the-view-s-more-menu-to-a/after-list-menu-phone-light.png)
