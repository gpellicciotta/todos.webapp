---
id: T0294
owner: ~
needs: [T0254]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
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
- [ ] **[Read]**      Read the vendored inbox.js, notices.js, inbox.css, and the NTF requirements in ui-design.md.
- [ ] **[Decide]**    Decide whether to keep the package's bulk selection, and record the decision in the technical spec.
- [ ] **[Implement]** Update the unit and e2e tests of the technical spec for the package markup.
- [ ] **[Verify]**    Run them and confirm they fail on main.
- [ ] **[Implement]** Rebuild the bell, panel, and banners on the package modules and drop the replaced styles.
- [ ] **[Verify]**    Run the completion check and capture before and after screenshots at 390 and 1440 px.
- [ ] **[Doc]**       Update the UI design spec, the visual style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.
