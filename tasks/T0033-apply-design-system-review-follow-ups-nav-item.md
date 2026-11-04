---
id: T0033
owner: ~
needs: [T0010]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0033: Apply design system review follow-ups: nav item edge, token math, sync dot ring, live region class, toast hold and Undo

## Goals
Apply the open review follow-ups from T0030 and T0031 to the design system and behavior modules.
Give the current nav item a logical inset edge with hover and active feedback, and replace unitless token math.
Match the sync dot's ring to its ground, add a bottom bar active specimen, and use `.visually-hidden` for the live region.
Hold toasts while a modal dialog is open, and let Ctrl or Cmd+Z run the newest Undo outside text fields.
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
