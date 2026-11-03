---
id: T0001
owner: ~
needs: []
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
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
- [ ] **[Read]**      Read the sources listed in technical-spec.md.
- [ ] **[Decide]**    Resolve the open questions in technical-spec.md with the user.
- [ ] **[Doc]**       Write docs/requirements.md with numbered, testable requirements.
- [ ] **[Doc]**       Link it from docs/index.md and add a CHANGELOG.md entry.
- [ ] **[Review]**    Obtain human review approval of the requirements before completion.

## Execution Log
- [2026-11-03] **[Doc]**
  Companion task file scaffolded at task creation.
