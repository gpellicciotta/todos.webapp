---
id: T0231
owner: ~
needs: [T0230]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0231: Move the app shell and shared components onto the vendored design system, keeping task rows app-local.

## Goals
Move the app's layout onto the vendored `shell.css` with every area, both navigations, and `app--scroll-main`, per [ADR-0004](../../../support.webapp/docs/adrs/ADR-0004-app-shell.md).
The add bar becomes the action bar, the editor becomes the side panel, and the floating action button moves to the overlay layer.
Replace the app's own copies of the shared components with the vendored ones, per [components.md](../../../support.webapp/docs/specs/components.md).
Keep app-local components, such as task rows, in the app.
Prove a lossless switch as [ADR-0007](../../../support.webapp/docs/adrs/ADR-0007-documentation-and-verification.md) requires.

## Task Execution Steps
- [ ] **[Read]**      Read the named ADRs and the app at a recorded commit.
- [ ] **[Decide]**    Write declared files, size estimate, tests, and the completion check into the technical specification.
- [ ] **[Implement]** Write the failing tests named in the technical specification.
- [ ] **[Verify]**    Run the new tests and record their failure output in validation-proof.md.
- [ ] **[Implement]** Move the layout onto shell.css and switch the shared components to the vendored modules.
- [ ] **[Verify]**    Run the tests, the vendored check, and the completion check until they pass.
- [ ] **[Visual]**    Record the lossless switch proof: screenshots at 390 and 1440 px, light and dark.
- [ ] **[Doc]**       List every visual difference as a fix or deliberate change, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Created from the support.webapp adoption roadmap at the user's request.
