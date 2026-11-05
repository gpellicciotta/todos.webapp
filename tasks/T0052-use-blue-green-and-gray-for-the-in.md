---
id: T0052
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
# T0052: Use blue, green, and gray for the In progress, Completed, and Cancelled status icons

## Goals
Color the status icons: blue for In progress, green for Completed, and gray for Cancelled.
To do keeps the text color. Shapes stay unchanged, so color never carries status alone.
Colors meet 3:1 against surfaces in light and dark themes.
Completion check: `npm test` and `npx playwright test tests/e2e/gallery-app.spec.js`

## Task Execution Steps
- [ ] **[Read]**      Read tokens.css, the status button styles, and the contrast checks in tokens.test.js.
- [ ] **[Decide]**    Pick blue and green ramps that stay distinct from the navy signal color.
- [ ] **[Implement]** Author tests: status tokens exist, meet 3:1 in both themes, and drive the icons.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the expected reason.
- [ ] **[Implement]** Add status color tokens and apply them to the status button and status menu icons.
- [ ] **[Visual]**    Capture before and after screenshots in light and dark themes.
- [ ] **[Verify]**    Run unit and end-to-end tests and confirm they pass.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-05] **[Doc]**
  Companion task file scaffolded at task creation.
