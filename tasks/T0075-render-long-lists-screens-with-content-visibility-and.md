---
id: T0075
owner: "@claude"
session: claude-20261117-17e9e3
needs: []
branch: task/T0075-render-long-lists-screens-with-content-visibility-and
worktree: .plan/work/T0075-render-long-lists-screens-with-content-visibility-and
status: active
started_at: "2026-11-17T04:51:56Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0075: Render long Lists screens with content-visibility and lazy row menus, with roving focus between rows

## Goals
Make long Lists screens cheap: `content-visibility: auto` rows, row menus built on first open, and roving focus between rows.
Follow ui-design.md, Many Lists: rendering, keyboard (`LST-15`, `TEC-16`).
Keep find in page, the tab order, and the restored scroll position true.

## Task Execution Steps
- [x] **[Implement]** Author unit and e2e tests for lazy menus, roving focus, and scroll restore with 300 lists.
- [x] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [x] **[Implement]** Add `content-visibility` rows, build each row menu on first open, and add roving tabindex over rows.
- [x] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [x] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-17] **[Verify]**
  Tests failed first, then passed; added lazy menus, roving focus, content-visibility, router wait. behaviors.spec.js:109 fails on base too.

- [2026-11-17] **[Implement]**
  Added unit and e2e tests with 300 lists, then content-visibility rows, lazy row menus, and roving tab stop in lists.js, views.css, and app.js.

- [2026-11-17] **[Doc]**
  Updated ui-design.md Many Lists, CHANGELOG.md, and the lists.js header comment; bumped the service worker VERSION.

- [2026-11-17] **[Verify]**
  Unit tests failed first: 7 failed, 1 passed of 8; proof is in validation-proof.md.

- [2026-11-17] **[Verify]**
  Full vitest 1670 passed, lint clean, e2e 241 passed with one failure that predates the task.

