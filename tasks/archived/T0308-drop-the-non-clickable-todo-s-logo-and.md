---
id: T0308
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-27T23:02:28Z"
ended_at: "2026-11-27T23:14:16Z"
review: none
preview: none
protocol: adhoc
completion-commit: 7fced260b764577c628e7743580745c82e1a76b8
---
# T0308: Drop the non-clickable ToDo's logo and name from the sidebar

## Goals
Drop the non-clickable ToDo's logo and name from the sidebar.

## Task Execution Steps
- [x] **[Implement]** Write unit and wireframe tests that expect no sidebar brand.
- [x] **[Verify]**    Run the new tests and confirm they fail.
- [x] **[Implement]** Remove the brand markup and styles, and bump the service worker version.
- [x] **[Doc]**       Update specs, wireframes, devops notes, and CHANGELOG.md.
- [x] **[Verify]**    Run `python scripts/devops.py check` and confirm it passes.
- [x] **[Visual]**    Capture before and after screenshots in light, dark, wide, rail, and compact views.

## Visual Verification
- Wide, light:
  - Before: [before-wide-light.png](T0308-drop-the-non-clickable-todo-s-logo-and/before-wide-light.png).
  - After: [after-wide-light.png](T0308-drop-the-non-clickable-todo-s-logo-and/after-wide-light.png).
- Wide, dark:
  - Before: [before-wide-dark.png](T0308-drop-the-non-clickable-todo-s-logo-and/before-wide-dark.png).
  - After: [after-wide-dark.png](T0308-drop-the-non-clickable-todo-s-logo-and/after-wide-dark.png).
- Rail, light:
  - Before: [before-rail-light.png](T0308-drop-the-non-clickable-todo-s-logo-and/before-rail-light.png).
  - After: [after-rail-light.png](T0308-drop-the-non-clickable-todo-s-logo-and/after-rail-light.png).
- Compact, light:
  - Before: [before-compact-light.png](T0308-drop-the-non-clickable-todo-s-logo-and/before-compact-light.png).
  - After: [after-compact-light.png](T0308-drop-the-non-clickable-todo-s-logo-and/after-compact-light.png).
- Compact, dark:
  - Before: [before-compact-dark.png](T0308-drop-the-non-clickable-todo-s-logo-and/before-compact-dark.png).
  - After: [after-compact-dark.png](T0308-drop-the-non-clickable-todo-s-logo-and/after-compact-dark.png).
- Gallery sidebar:
  - Before: [before-gallery-sidebar.png](T0308-drop-the-non-clickable-todo-s-logo-and/before-gallery-sidebar.png).
  - After: [after-gallery-sidebar.png](T0308-drop-the-non-clickable-todo-s-logo-and/after-gallery-sidebar.png).
- Gallery rail:
  - Before: [before-gallery-rail.png](T0308-drop-the-non-clickable-todo-s-logo-and/before-gallery-rail.png).
  - After: [after-gallery-rail.png](T0308-drop-the-non-clickable-todo-s-logo-and/after-gallery-rail.png).

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Decided]**
  Kept a task file because 12 counted files exceed the typical line; a split piece could not merge alone.

- [2026-11-28] **[Verify]**
  New tests failed first, then the full check passed. Screenshots showed no console, page, or network errors.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 12
  - Lines touched: 77
  - Reopenings: 0

- [2026-11-28] **[Implement]**
  Removed the sidebar brand markup and styles, and bumped the service worker version.

- [2026-11-28] **[Doc]**
  Updated specs, devops notes, regenerated wireframes, and added a CHANGELOG.md entry.

- [2026-11-28] **[Complete]**
  The sidebar of the app, gallery, and wireframes now starts without a logo or app name.
