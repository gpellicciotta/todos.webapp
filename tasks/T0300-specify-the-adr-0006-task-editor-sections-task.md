---
id: T0300
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-27T23:34:00Z"
ended_at: "2026-11-28T00:01:16Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 5
review_requested_at: "2026-11-27T23:59:10Z"
reviewed_by: "@gpellicciotta"
completion-commit: 6d17278a7a767da29a20d71ed2e076dc70ef279f
---
# T0300: Specify the ADR-0006 task editor sections, task row marks, and log form in the UI design and wireframes

## Goals
Specify the ADR-0006 interface of todos.server in docs/specs/ui-design.md and docs/requirements.md.
The task editor gets four tabs, Status, Notes, Configuration, and History, and opens on Status.
Configuration holds Description, Lists, Goal, Recurrence with a yearly unit, Time window with a start time, and a Danger zone.
Task rows show goal progress, orange over-limit and behind-pace marks, red Failed, and an Upcoming group.
A log form and quick log record a check, time spent, an amount, and a label; entries list with Undo.
Update the wireframes through scripts/draw-wireframes.py.

## Task Execution Steps
- [x] **[Read]**      Read ADR-0006, ui-design.md, the visual style guide, and the wireframe script.
- [x] **[Doc]**       Update the Task Editor, Task Row, and Key Flows sections, and add the requirements.
- [x] **[Doc]**       Update draw-wireframes.py for the editor sections, row marks, and log form, then regenerate.
- [x] **[Verify]**    Run the wireframe tests and lint the specs.
- [x] **[Doc]**       Update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-27] **[Doc]**
  Task file written from ADR-0006 of todos.server, which Codex approved.

- [2026-11-28] **[Decided]**
  Started in a separate worktree, as the user chose, since the primary checkout held uncommitted add bar work; rebased after a7956d0 landed.

- [2026-11-28] **[Implement]**
  Wrote failing wireframe tests, then redrew rows, the four-tab editor, the quick log, and the view options brace; specified them in ui-design.md and requirements.md.

- [2026-11-28] **[Verify]**
  Wireframe tests and the offline Markdown lint pass; screenshots and outputs sit in validation-proof.md.
  - 172 tests passed.
  - Size note: 5 counted files, 910 lines, above the typical line.

- [2026-11-28] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-28] **[Review]**
  Requested round 1 and launched the Codex reviewer in the worktree as background task bexv5hdhc.
  - plan agents run --sandbox --agent codex --task-id T0300.
  - Session review-T0300-1, prompt from stdin, timeout 2400 s.

- [2026-11-28] **[Review]**
  Round 1 rejected by @codex: Five blocking ADR-0006 conflicts: start-time edit rule, target ranges, overdue cancel rule, carried readings, and Reopen after expiry.
  - Findings: [review-findings-1.md](T0300-specify-the-adr-0006-task-editor-sections-task/review-findings-1.md).

- [2026-11-28] **[Review]**
  Codex rejected round 1: start-time edits, target ranges, overdue expiry, carried readings, and Reopen limits; fixed them in b90fe5c.

- [2026-11-28] **[Review]**
  Round 2 requested (mode: agent).

- [2026-11-28] **[Review]**
  Requested round 2 and launched the Codex reviewer as background task bnz8hk8sh, session review-T0300-2.

- [2026-11-28] **[Review]**
  Round 2 rejected by @codex: Stale editor and icon descriptions in the visual style guide, and Amount missing from the extra log fields.
  - Findings: [review-findings-2.md](T0300-specify-the-adr-0006-task-editor-sections-task/review-findings-2.md).

- [2026-11-28] **[Review]**
  Codex rejected round 2 for stale style guide editor and icon text and a missing Amount log field; fixed in 56b712e.

- [2026-11-28] **[Review]**
  Round 3 requested (mode: agent).

- [2026-11-28] **[Review]**
  Requested round 3 and launched the Codex reviewer as background task b4gnkfjm1, session review-T0300-3.

- [2026-11-28] **[Review]**
  Round 3 rejected by @codex: At-most readings without any reading must fail at close, and Cancel task must be disabled on closed occurrences.
  - Findings: [review-findings-3.md](T0300-specify-the-adr-0006-task-editor-sections-task/review-findings-3.md).

- [2026-11-28] **[Review]**
  Codex rejected round 3 for at-most readings without any reading and Cancel task on closed tasks; fixed in fa3c0a3.

- [2026-11-28] **[Review]**
  Round 4 requested (mode: agent).

- [2026-11-28] **[Review]**
  Requested round 4 and launched the Codex reviewer as background task bw4x94xpn, session review-T0300-4.

- [2026-11-28] **[Review]**
  Round 4 rejected by @codex: Unmark started must require no applied entry and progress zero or null, as ADR-0006 defines for unstart.
  - Findings: [review-findings-4.md](T0300-specify-the-adr-0006-task-editor-sections-task/review-findings-4.md).

- [2026-11-28] **[Review]**
  Codex rejected round 4 with one finding: Unmark started needs no applied entry and progress zero or null; awaiting the user's call.

- [2026-11-28] **[Review]**
  Fixed the round 4 finding in 1139d33; the user chose to approve the review and complete without a fifth Codex round.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 5.
  - Lines touched: 975.
  - Reopenings: 0.

- [2026-11-28] **[Review]**
  Round 5 requested (mode: agent).

- [2026-11-28] **[Review]**
  Round 5 approved by @gpellicciotta.

- [2026-11-28] **[Complete]**
  Task completed successfully.

