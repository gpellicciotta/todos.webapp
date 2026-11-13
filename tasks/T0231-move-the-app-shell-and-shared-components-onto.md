---
id: T0231
owner: "@claude"
needs: []
branch: task/T0231-move-the-app-shell-and-shared-components-onto
worktree: .plan/work/T0231-move-the-app-shell-and-shared-components-onto
status: active
started_at: "2026-11-13T11:54:40Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0231: Move the app layout onto the vendored shell.css, with the action bar, side panel, and overlay layer.

## Goals
Move the app's layout onto the vendored `shell.css` with every area, both navigations, and `app--scroll-main`, per [ADR-0004](../../../support.webapp/docs/adrs/ADR-0004-app-shell.md).
The add bar becomes the action bar, the editor becomes the side panel, and the floating button and toasts move to the overlay layer.
Move every fixed or sticky position into shell areas, so the vendored check reports no warnings.
Keep the app's own components; [T0233](T0233-replace-the-app-s-shared-components-with-the.md) replaces them.
Prove a lossless switch as [ADR-0007](../../../support.webapp/docs/adrs/ADR-0007-documentation-and-verification.md) requires, with T0230's proof harness.

## Task Execution Steps
- [ ] **[Read]**      Read the named ADRs and the app at a recorded commit.
- [ ] **[Decide]**    Write declared files, size estimate, tests, and the completion check into the technical specification.
- [ ] **[Implement]** Write the failing tests named in the technical specification.
- [ ] **[Verify]**    Run the new tests and record their failure output in validation-proof.md.
- [ ] **[Implement]** Move the layout markup and styles onto shell.css, and remove the app's own shell styles.
- [ ] **[Verify]**    Run the tests, the vendored check, and the completion check until they pass.
- [ ] **[Visual]**    Record the lossless switch proof: screenshots at 390 and 1440 px, light and dark.
- [ ] **[Doc]**       List every visual difference as a fix or deliberate change, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Created from the support.webapp adoption roadmap at the user's request.

- [2026-11-13] **[Doc]**
  Split from the original scope at the user's request; the shared components moved to T0233.
