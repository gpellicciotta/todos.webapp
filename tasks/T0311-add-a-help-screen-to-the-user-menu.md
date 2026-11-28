---
id: T0311
owner: "@claude"
session: claude-20261128-026f37
needs: []
branch: task/T0311-add-a-help-screen-to-the-user-menu
worktree: .plan/work/T0311-add-a-help-screen-to-the-user-menu
status: completed
started_at: "2026-11-28T02:07:45Z"
ended_at: "2026-11-28T02:56:34Z"
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 4, duration_s: 2743.1, input: 66, output: 16703, cache_read: 8342054, cache_write: 39353}
  review: {turns: 2, duration_s: 102.0, input: 56141, output: 2987, cache_read: 428160, cache_write: 0}
work_duration: 2929.4
review_status: approved
review_round: 2
review_requested_at: "2026-11-28T02:55:43Z"
review_session: codex-20261128-6198b1
reviewed_by: "@codex"
completion-commit: 300160d41aee5d6af95b2c2d801dcc14e4bcb150
---
# T0311: Add a Help screen to the user menu from the help docs, and drop Keyboard shortcuts and About from Settings

## Goals
Add Help to the user menu, opening a `#/help` screen modeled on the Help screen of the Counters app.
Its panels are Application Info & Support, Welcome to ToDo's, Getting Started Tutorial, FAQ, and Release notes.
The middle three come from the `docs/tutorial` Markdown of T0309, and Release notes from `CHANGELOG.md`, both served by T0310.
Settings drops its Keyboard shortcuts and About sections, whose content moves to Help.
Details are in [technical-spec.md](T0311-add-a-help-screen-to-the-user-menu/technical-spec.md).

## Task Execution Steps
- [x] **[Implement]** Write unit tests for the Markdown renderer, the Help view, the route, the menu, and Settings.
- [x] **[Implement]** Write wireframe tests and the Help end-to-end tests at 390 and 1440 px.
- [x] **[Verify]**    Run the new tests and confirm they fail.
- [x] **[Implement]** Vendor the support.js changelog parser, and add the Markdown renderer and the Help view.
- [x] **[Implement]** Add the help route and the Help menu item, and drop Shortcuts and About from Settings.
- [x] **[Implement]** Precache the new modules, bump VERSION, and redraw the wireframes.
- [x] **[Verify]**    Run `python scripts/devops.py check` and confirm it passes.
- [x] **[Visual]**    Capture Help and Settings before and after, in light and dark, at 390 and 1440 px.
- [x] **[Doc]**       Update requirements, ui-design.md, visual-style-guide.md, and CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Decided]**
  Kept the screen, the Settings removal, specs, and wireframes together: either half alone shows the shortcuts twice or nowhere.

- [2026-11-28] **[Decided]**
  The user chose the GitHub issues link for Report a problem, over an email link.

- [2026-11-28] **[Verify]**
  New unit and wireframe tests fail before implementation.
  - 6 unit tests failed, 2 files unresolved.
  - Wireframe tests fail on missing help.svg.

- [2026-11-28] **[Implement]**
  Built Help screen, Markdown renderer, route, menu item, and Settings removal.
  - Parser vendored at 3.1.0-pre, not spec's 4.0.1-pre.
  - Also touched index.html, layout.js, shell.spec.js.

- [2026-11-28] **[Verify]**
  devops check passes; visuals and docs done.
  - Files touched: 20.
  - Lines touched: 495.
  - Reopenings: 0.

- [2026-11-28] **[Visual]**
  Captured Help and Settings before and after, light and dark, at 390 and 1440 px.

- [2026-11-28] **[Doc]**
  Updated requirements, ui-design.md, visual-style-guide.md, and CHANGELOG.md.

- [2026-11-28] **[Implement]**
  Precached new modules, bumped VERSION to 2026-11-28.5, redrew wireframes.

- [2026-11-28] **[Decided]**
  Kept the Help route free of query parameters; search and topic chips cover filtering.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: [Decided]** Rejected: Help does not support the specified query links.
  - Findings: [review-findings-1.md](T0311-add-a-help-screen-to-the-user-menu/review-findings-1.md).

- [2026-11-28] **[Decided]**
  Reversed the earlier omission: Help now supports ?q= and ?topic= links, as the spec requires.

- [2026-11-28] **[Implement]**
  Router carries hash query; Help applies it on update; added unit and e2e tests.
  - VERSION bumped to 2026-11-28.6.

- [2026-11-28] **[Verify]**
  devops check passes after rework.
  - 1908 unit, 296 e2e, 271 Python tests passed.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 2 approved by @codex: [Decided]** Approved.
  - Findings: [review-findings-2.md](T0311-add-a-help-screen-to-the-user-menu/review-findings-2.md).

- [2026-11-28] **[Complete]**
  Task completed successfully.

## Visual Verification
- Before: [settings-before.png](T0311-add-a-help-screen-to-the-user-menu/settings-before.png)
- After: [settings-after.png](T0311-add-a-help-screen-to-the-user-menu/settings-after.png)
- After: [help-after.png](T0311-add-a-help-screen-to-the-user-menu/help-after.png)
