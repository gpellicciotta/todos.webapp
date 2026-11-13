---
id: T0231
owner: "@claude"
session: claude-20261113-f78518
needs: []
branch: task/T0231-move-the-app-shell-and-shared-components-onto
worktree: .plan/work/T0231-move-the-app-shell-and-shared-components-onto
status: active
started_at: "2026-11-13T11:54:40Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 3603.2, input: 4, output: 16}
work_duration: 1828.9
---
# T0231: Move the app layout onto the vendored shell.css, with the action bar, side panel, and overlay layer.

## Goals
Move the app's layout onto the vendored `shell.css` with every area, both navigations, and `app--scroll-main`, per [ADR-0004](../../../support.webapp/docs/adrs/ADR-0004-app-shell.md).
The add bar becomes the action bar, the editor becomes the side panel, and the floating button and toasts move to the overlay layer.
Move every fixed or sticky position into shell areas, so the vendored check reports no warnings.
Keep the app's own components; [T0233](T0233-replace-the-app-s-shared-components-with-the.md) replaces them.
Prove a lossless switch as [ADR-0007](../../../support.webapp/docs/adrs/ADR-0007-documentation-and-verification.md) requires, with T0230's proof harness.

## Task Execution Steps
- [x] **[Read]**      Read the named ADRs and the app at a recorded commit.
- [x] **[Decide]**    Write declared files, size estimate, tests, and the completion check into the technical specification.
- [x] **[Implement]** Write the failing tests named in the technical specification.
- [x] **[Verify]**    Run the new tests and record their failure output in validation-proof.md.
- [x] **[Implement]** Move the layout markup and styles onto shell.css, and remove the app's own shell styles.
- [x] **[Verify]**    Run the tests, the vendored check, and the completion check until they pass.
- [x] **[Visual]**    Record the lossless switch proof: screenshots at 390 and 1440 px, light and dark.
- [x] **[Doc]**       List every visual difference as a fix or deliberate change, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Created from the support.webapp adoption roadmap at the user's request.

- [2026-11-13] **[Doc]**
  Split from the original scope at the user's request; the shared components moved to T0233.

- [2026-11-13] **[Decide]**
  Read ADR-0004, ADR-0007, components.md, and the app at 56e799b; wrote decisions, declared files, and tests into the technical specification.
  - Size estimate: 18 files, 700 lines.

- [2026-11-13] **[Implement]**
  Moved the layout onto shell.css: areas in layout.js, add block into the action bar, floating button into the overlay layer; removed app-shell.css.
  - Size note: 18 counted files, 434 lines, above the typical line.
  - Uncounted: generated hash manifest and the e2e selector sweep.

- [2026-11-13] **[Verify]**
  Completion check passed: devops.py check (1250 unit, 198 e2e, 156 pytest) and the vendored check, with no warnings.
  - Evidence: validation-proof.md.

- [2026-11-13] **[Visual]**
  Recorded the lossless switch proof: 8 screens at 390 and 1440 px, light and dark, with no console or network problems.
  - Before: [list](T0231-move-the-app-shell-and-shared-components-onto/screenshots/before/light-390/list.png), [task editor](T0231-move-the-app-shell-and-shared-components-onto/screenshots/before/light-1440/task-editor.png), [all](T0231-move-the-app-shell-and-shared-components-onto/screenshots/before/).
  - After: [list](T0231-move-the-app-shell-and-shared-components-onto/screenshots/after/light-390/list.png), [task editor](T0231-move-the-app-shell-and-shared-components-onto/screenshots/after/light-1440/task-editor.png), [all](T0231-move-the-app-shell-and-shared-components-onto/screenshots/after/).

- [2026-11-13] **[Doc]**
  Listed every visual difference in technical-spec.md as a deliberate change or fix; updated ui-design.md, the style guide, and CHANGELOG.md.
  - Main change: the add bar sits under the rows on wide screens.

- [2026-11-13] **[Decided]**
  Add bar moves into the action bar under the rows in both layouts, as ADR-0004 and the support.webapp todos demo place it; navigation keeps app item classes beside shell classes.
  - All decisions: technical-spec.md, Decisions.

- [2026-11-13] **[Implement]**
  Wrote failing tests for the shell areas, action bar, side panel, overlay layer, skip link, and a vendored check with no warnings; committed as 25ff616.

- [2026-11-13] **[Verify]**
  Recorded the red phase: 11 unit tests and 2 e2e tests failed as expected before any production change.
  - Evidence: validation-proof.md, Red Phase.

