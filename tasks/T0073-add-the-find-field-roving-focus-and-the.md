---
id: T0073
owner: "@claude"
session: claude-20261117-ad5069
needs: []
branch: task/T0073-add-the-find-field-roving-focus-and-the
worktree: .plan/work/T0073-add-the-find-field-roving-focus-and-the
status: active
started_at: "2026-11-17T04:25:51Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 442.6, input: 80, output: 28760, cache_read: 4099093, cache_write: 104319}
review_status: pending
review_round: 1
review_requested_at: "2026-11-17T04:33:21Z"
---
# T0073: Add the find field, roving focus, and the l shortcut to the sidebar lists

## Goals
Add the find field to the sidebar from 12 lists, with roving focus and the `l` shortcut.
Follow ui-design.md, Sidebar With Many Lists and Many Lists: name matching, "4 of 124", Enter, Escape, and Down (`LST-10`, `LST-15`).
Announce the match count through the polite live region after typing pauses for 150 ms.

## Task Execution Steps
- [x] **[Implement]** Author unit and e2e tests for the field, matching, keys, the shortcut, and the announcement.
- [x] **[Verify]**    Run the new tests and record that they fail before the code exists.
- [x] **[Implement]** Add the sidebar find field, the filter, roving tabindex, the `l` shortcut, and the live announcement.
- [x] **[Verify]**    Run the new tests, `npm test`, and `npm run lint`; record the passing output.
- [x] **[Doc]**       Update ui-design.md, the changelog, and the lists module comments.
- [x] **[Implement]** Add the `l` row to the About shortcut list in settings.js, with its unit test.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-09] **[Decided]**
  Added a step to list the new shortcut in Settings About, which T0214 creates.

- [2026-11-17] **[Verify]**
  New unit and e2e tests fail before the code exists.
  - layout-find, settings, sidebar-find specs red.

- [2026-11-17] **[Implement]**
  Added sidebar find field, roving focus, l shortcut, announcement, and Settings row.
  - Unit, e2e, lint green.

- [2026-11-17] **[Verify]**
  Recorded task outcomes.
  - Files touched: 8.
  - Lines touched: 238.
  - Reopenings: 0.

- [2026-11-17] **[Doc]**
  Updated ui-design.md, the changelog, and the layout and list-find comments.

- [2026-11-17] **[Review]**
  Round 1 requested (mode: agent).

