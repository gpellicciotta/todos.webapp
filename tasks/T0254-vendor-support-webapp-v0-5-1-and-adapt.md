---
id: T0254
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
# T0254: Vendor support.webapp v0.5.1 and adapt the app to its shell, nav toggle, and component changes

## Goals
Move the vendored design system from v0.2.1 to support.webapp v0.5.1, released 2026-11-24.
Keep every screen looking and behaving as on main, apart from the package changes adopted on purpose.
Adapt the app where v0.5.1 changes shared classes, the nav toggle, or the shell, as the technical spec lists.
Keep new package modules unused here; follow-up tasks adopt them one at a time.
Completion check: `python scripts/devops.py check`, plus the screenshot comparison in the technical spec.

## Task Execution Steps
- [ ] **[Read]**      Read the support.webapp changelog from v0.3.0 to v0.5.1 and docs/devops.md Vendored Design System.
- [ ] **[Implement]** Vendor v0.5.1 and update design.json, the precache list, and its hashes.
- [ ] **[Verify]**    Run the check and the e2e suite; record each failure the new package causes.
- [ ] **[Implement]** Update design-system and shell tests for the new pin, nav toggle glyphs, and rail tooltips; prove them failing.
- [ ] **[Implement]** Adapt view headers, the nav toggle sprite glyphs, and rail entry titles to v0.5.1.
- [ ] **[Verify]**    Run the completion check and compare screenshots at 390 and 1440 px in both themes.
- [ ] **[Doc]**       Update devops.md, the visual style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Decided]**
  Suspended as superseded: main vendored support.webapp 0.2.1 through T0283, which already holds T0049's switch.

- [2026-11-24] **[Doc]**
  Companion task file scaffolded when the protocol changed from adhoc to standard.

- [2026-11-24] **[Decided]**
  Reopened as the v0.5.1 upgrade after support.webapp released it; T0286 waits on it.
