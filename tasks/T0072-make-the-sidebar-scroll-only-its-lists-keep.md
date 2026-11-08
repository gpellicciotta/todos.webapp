---
id: T0072
owner: ~
needs: [T0071]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0072: Make the sidebar scroll only its lists, keep the current list in view, and patch rows in place

## Goals
Make the wide sidebar scroll only its list rows, below fixed brand, All tasks, and Lists items.
Keep the current list in view, keep the scroll across routes, and patch rows by list identifier.
Hide a zero count and cap counts at "999+"; see ui-design.md, Sidebar With Many Lists (`LST-14`).

## Task Execution Steps
- [ ] **[Implement]** Author unit and e2e tests for the scroll region, the in-view rule, and in-place patching.
- [ ] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [ ] **[Implement]** Add a fixed header and scroll region, patch rows by id, and scroll the current row into view.
- [ ] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [ ] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.
