---
id: T0034
owner: ~
needs: [T0015]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0034: Make the app an installable offline PWA: manifest, app icons, versioned service worker precache, and offline tests

## Goals
Add the web app manifest and app icons, so the app is installable (`TEC-1`).
Add a versioned service worker that precaches the app shell and serves it offline, with no cross-origin requests (`LOC-3`).
A test fails when a file the app needs is missing from the precache list.
Split from T0015 on 2026-11-04 for size; the code was written during T0015.
See technical-spec.md for files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the parked code written during T0015 and the review follow-ups it covers.
- [ ] **[Implement]** Take over the failing tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the tests without the implementation, confirm they fail, and record the output.
- [ ] **[Implement]** Take over the implementation from the T0015 working tree.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Doc]**       Update the affected docs and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
