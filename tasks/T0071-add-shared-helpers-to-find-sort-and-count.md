---
id: T0071
owner: "@claude"
session: claude-20261108-7fb151
needs: []
branch: task/T0071-add-shared-helpers-to-find-sort-and-count
worktree: .plan/work/T0071-add-shared-helpers-to-find-sort-and-count
status: active
started_at: "2026-11-07T23:21:47Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0071: Add shared helpers to find, sort, and count lists, with unit tests

## Goals
Add pure helpers to find, sort, and count lists, shared by the sidebar and the Lists screen.
Follow ui-design.md, Lists Overview, Many Lists: matching, sort choices, and the one-pass counts (`LST-10`, `LST-12`).
Make layout.js and lists.js use the shared count helper, without a visible change.

## Task Execution Steps
- [x] **[Implement]** Author unit tests for finding, sorting, and counting lists, including 500 lists and 5000 tasks.
- [x] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [x] **[Implement]** Add list-find.js, list-sort.js, and list-counts.js, and let layout.js and lists.js call the counts.
- [x] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [x] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-08] **[Verify]**
  Tests failed first, then passed: 1163 tests, lint, and service worker check green.
  - Files touched: 14.
  - Lines touched: 84 tracked plus new files.
  - Reopenings: 0.

- [2026-11-08] **[Doc]**
  Undeclared files touched: app.js, index.html, service-worker.js, sw hash manifest, CHANGELOG.md, ui-design.md; precache tests required them.

- [2026-11-08] **[Implement]**
  Wrote find, sort, and count unit tests, then list-find.js, list-sort.js, and list-counts.js.
  - layout.js, lists.js, and app.js use countLists.

- [2026-11-08] **[Verify]**
  Red phase recorded: three new test files failed on missing modules before any code existed.

- [2026-11-08] **[Implement]**
  Added the new modules to preload, precache, and the hash manifest; bumped service worker VERSION to 2026-11-08.3.

