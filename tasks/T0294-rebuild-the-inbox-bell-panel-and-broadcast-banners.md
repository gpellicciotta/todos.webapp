---
id: T0294
owner: "@claude"
session: claude-20261124-606bb9
needs: []
branch: task/T0294-rebuild-the-inbox-bell-panel-and-broadcast-banners
worktree: .plan/work/T0294-rebuild-the-inbox-bell-panel-and-broadcast-banners
status: active
started_at: "2026-11-24T13:01:44Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1827.6, input: 12, output: 1556, cache_read: 865012, cache_write: 5102}
work_duration: 1811.5
review_status: pending
review_round: 1
review_requested_at: "2026-11-24T13:32:45Z"
---
# T0294: Rebuild the inbox bell, panel, and broadcast banners on the vendored inbox.js and notices.js

## Goals
Replace the hand-built bell, panel rows, and banners of [ui/inbox.js](../../src/js/ui/inbox.js) with the package modules.
Use `createUnreadButton` for the bell, `createInbox` inside the existing popover, and `attachNotices` for banners.
Keep NTF-1 to NTF-5: connected-only bell, newest first, Open, Mark read, Discard, Clear all, and banner Dismiss.
Keep [sync/inbox.js](../../src/js/sync/inbox.js) as the service adapter, answering the package's `inbox:action` events.
Drop the `inbox-*` rules of app-chrome.css that the package's inbox.css replaces.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [x] **[Read]**      Read the vendored inbox.js, notices.js, inbox.css, and the NTF requirements in ui-design.md.
- [x] **[Decide]**    Decide whether to keep the package's bulk selection, and record the decision in the technical spec.
- [x] **[Implement]** Update the unit and e2e tests of the technical spec for the package markup.
- [x] **[Verify]**    Run them and confirm they fail on main.
- [x] **[Implement]** Rebuild the bell, panel, and banners on the package modules and drop the replaced styles.
- [x] **[Verify]**    Run the completion check and capture before and after screenshots at 390 and 1440 px.
- [x] **[Doc]**       Update the UI design spec, the visual style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.

- [2026-11-24] **[Verify]**
  Updated unit and e2e tests fail on main as expected.
  - Unit: 26 failed, 36 passed.
  - E2E: 3 failed, 2 local-mode guards passed.

- [2026-11-24] **[Implement]**
  Rebuilt the bell, panel, and banner on createUnreadButton, createInbox, and attachNotices; the package inbox mounts only while the panel is open.

- [2026-11-24] **[Verify]**
  Completion check passed after mounting the inbox only while open; before and after screenshots are in validation-proof.md.
  - Vitest: 1808 passed.
  - Playwright: 276 passed.
  - pytest: 215 passed.

- [2026-11-24] **[Doc]**
  Size note: crossed the typical line at 9 files and 727 lines; the view and its tests cannot merge apart.

- [2026-11-24] **[Verify]**
  Recorded task outcomes.
  - Files touched: 9.
  - Lines touched: 727.
  - Reopenings: 0.

- [2026-11-24] **[Visual]**
  Captured the open panel and banner at 390 and 1440 px.
  - Before: [390](T0294-rebuild-the-inbox-bell-panel-and-broadcast-banners/before-390-light.png), [1440](T0294-rebuild-the-inbox-bell-panel-and-broadcast-banners/before-1440-light.png).
  - After: [390](T0294-rebuild-the-inbox-bell-panel-and-broadcast-banners/after-390-light.png), [1440](T0294-rebuild-the-inbox-bell-panel-and-broadcast-banners/after-1440-light.png).

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

