---
id: T0251
owner: "@claude"
needs: []
branch: task/T0251-move-the-view-s-more-menu-to-a
worktree: .plan/work/T0251-move-the-view-s-more-menu-to-a
status: active
started_at: "2026-11-17T00:03:41Z"
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read the More menus in all-tasks.js and list-actions.js, and the top bar in layout.js.
- [ ] **[Doc]**       Update the UI design for the header menu and redraw the affected wireframes.
- [ ] **[Implement]** Author failing unit tests for the header button, its menu per view, and the compact fallback.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Add the header slot and the icon, and move both view menus into it on wide layouts.
- [ ] **[Verify]**    Run the unit and e2e suites and confirm they pass.
- [ ] **[Visual]**    Capture the header in All tasks and a list, light and dark, at desktop and phone widths.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the user's request for a header kebab menu.
