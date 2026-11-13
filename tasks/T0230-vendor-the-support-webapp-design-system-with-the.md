---
id: T0230
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
# T0230: Vendor the support.webapp design system with the neutral look and apply its token renames, losslessly.

## Goals
Vendor the first support.webapp release with the `neutral` look, as [ADR-0005](../../../support.webapp/docs/adrs/ADR-0005-distribution-and-versioning.md) describes.
Apply the token renames of [ADR-0001](../../../support.webapp/docs/adrs/ADR-0001-layer-model-and-token-contract.md) and [naming.md](../../../support.webapp/docs/specs/naming.md), each keeping its value.
Search for every renamed token afterwards, so no old name such as `--space-8` silently changes size.
Prove a lossless switch as [ADR-0007](../../../support.webapp/docs/adrs/ADR-0007-documentation-and-verification.md) requires.
Start once support.webapp publishes its first release; see the [roadmap](../../../support.webapp/docs/roadmap.md), Phase 1.

## Task Execution Steps
- [ ] **[Read]**      Read the named ADRs and the app at a recorded commit.
- [ ] **[Decide]**    Write declared files, size estimate, tests, and the completion check into the technical specification.
- [ ] **[Implement]** Write the failing tests named in the technical specification.
- [ ] **[Verify]**    Run the new tests and record their failure output in validation-proof.md.
- [ ] **[Implement]** Vendor the release and apply the token renames across the stylesheets and scripts.
- [ ] **[Verify]**    Run the tests, the vendored check, and the completion check until they pass.
- [ ] **[Visual]**    Record the lossless switch proof: screenshots at 390 and 1440 px, light and dark.
- [ ] **[Doc]**       List every visual difference as a fix or deliberate change, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-13] **[Doc]**
  Created from the support.webapp adoption roadmap at the user's request.
