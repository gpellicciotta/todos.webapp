---
id: T0001
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: suspended
started_at: "2026-11-03T17:03:53Z"
ended_at: —
review: human
preview: none
protocol: standard
review_status: pending
review_round: 1
---
# T0001: Write the functional and technical requirements for the offline-first web app in docs/requirements.md

## Goals
Write docs/requirements.md with numbered, testable functional and technical requirements for the web app.
Start from the founding requirements: work 100% offline without a backend, and use the todos service fully once connected.
Derive features from the todos REST API and business logic specs and the frozen legacy webapp, without copying its code.
Resolve the open questions in technical-spec.md with the user before finalizing.
Link docs/requirements.md from docs/index.md.
Completion check: `python ../dev-guidelines/scripts/lint-markdown.py check docs`, then human review.

### Declared Files
- docs/requirements.md
- docs/index.md
- CHANGELOG.md

Size estimate: 3 files, 250 lines

## Task Execution Steps
- [x] **[Read]**      Read the sources listed in technical-spec.md.
- [x] **[Decide]**    Resolve the open questions in technical-spec.md with the user.
- [x] **[Doc]**       Write docs/requirements.md with numbered, testable requirements.
- [x] **[Doc]**       Link it from docs/index.md and add a CHANGELOG.md entry.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-03] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-03] **[Decide]**
  Resolved all open questions with the user; recorded answers and agent decisions in technical-spec.md.

- [2026-11-03] **[Doc]**
  Wrote docs/requirements.md with 126 numbered requirements; recorded service gaps as todos backlog tasks T0147 to T0149.
  - Lint: all 3 markdown files passed.

- [2026-11-03] **[Verify]**
  Recorded task outcomes.
  - Files touched: 3.
  - Lines touched: 215.
  - Reopenings: 0.

- [2026-11-03] **[Review]**
  Round 1 requested (mode: human).

