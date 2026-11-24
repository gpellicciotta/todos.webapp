---
id: T0288
owner: "@claude"
session: claude-20261124-c88274
needs: []
branch: task/T0288-add-the-nav-toggle-and-the-icon-rail
worktree: .plan/work/T0288-add-the-nav-toggle-and-the-icon-rail
status: active
started_at: "2026-11-24T12:23:03Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 1, duration_s: 981.3, input: 98, output: 27440, cache_read: 4811510, cache_write: 123805}
review_status: pending
review_round: 1
review_requested_at: "2026-11-24T12:39:33Z"
---
# T0288: Add the nav toggle and the icon rail of the wide sidebar to the wireframes that draw-wireframes.py renders

## Goals
Draw the nav toggle at the start of every wide frame's top bar, as T0287 added it and T0254 updates its glyphs.
Add a `nav-rail.svg` wireframe of All tasks with the sidebar as an icon rail: glyphs, list monograms, and a hovered label.
Show the hidden state in the same wireframe's caption or a second wide frame, whichever fits the script's layout.
Embed the new wireframe in ui-design.md and regenerate docs/img/ui with the script.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [x] **[Read]**      Read draw-wireframes.py, its tests, and the nav toggle and rail sections of ui-design.md.
- [x] **[Implement]** Write the tests of the technical spec.
- [x] **[Verify]**    Run them and confirm they fail on main.
- [x] **[Implement]** Draw the toggle and the rail, add nav-rail.svg, and regenerate docs/img/ui.
- [x] **[Verify]**    Run the completion check and view the regenerated SVGs.
- [x] **[Doc]**       Update ui-design.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-17] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Specified and moved to Next Milestone after T0254, which sets the toggle glyphs; T0286 waits on it.

- [2026-11-24] **[Implement]**
  Drew the nav toggle in every wide frame's top row and added nav-rail.svg, with the hidden state in its caption; tests compare output with docs/img/ui ignoring CRLF.

- [2026-11-24] **[Visual]**
  Rendered the SVGs with Playwright Chromium; screenshots are linked in validation-proof.md.
  - Before: before-all-tasks.png, before-lists-many.png.
  - After: after-all-tasks.png, after-lists-many.png, after-import.png, after-nav-rail.png.

- [2026-11-24] **[Verify]**
  Completion check python scripts/devops.py check passed with exit code 0; output is in validation-proof.md.
  - Files touched: 3.
  - Lines touched: 211.
  - Reopenings: 0.

- [2026-11-24] **[Read]**
  The wireframes draw the wide top row as the sidebar brand row plus the page header; every wide frame goes through sidebar() or sidebar_many().

- [2026-11-24] **[Decided]**
  Placed the toggle at the frame's top left, before the brand, so it keeps its spot open, as a rail, and hidden. The hidden state stays in the caption; tests fix two frames per file.

- [2026-11-24] **[Verify]**
  The new tests failed on the base script with 27 failed and 99 passed, as validation-proof.md records.

- [2026-11-24] **[Doc]**
  Embedded nav-rail.svg in ui-design.md, added the toggle to its wide layout sketch, and added a CHANGELOG bullet under v0.5.1-pre.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

