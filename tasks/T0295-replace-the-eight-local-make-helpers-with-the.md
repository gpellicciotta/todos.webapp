---
id: T0295
owner: "@claude"
needs: []
branch: task/T0295-replace-the-eight-local-make-helpers-with-the
worktree: .plan/work/T0295-replace-the-eight-local-make-helpers-with-the
status: active
started_at: "2026-11-24T12:44:06Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0295: Replace the eight local make helpers with the vendored dom-builders.js

## Goals
Eight modules each define the same `make(doc, tag, className, text)` element helper.
Define `make` once in a new shared module over the `h` builder of the vendored `createDomBuilders(doc)`.
Drop the seven other copies; task-list.js re-exports the shared `make` for its nine importers.
Change no markup or behavior; the existing tests are the safety net.
Completion check: `python scripts/devops.py check`.

## Task Execution Steps
- [ ] **[Read]**      Read the vendored dom-builders.js and every local make helper and its callers.
- [ ] **[Implement]** Add a unit test proving the chosen builder matches make for class, text, and empty text.
- [ ] **[Verify]**    Run it and confirm it fails before the builder exists.
- [ ] **[Implement]** Add the shared make over h and replace the eight local helpers with imports of it.
- [ ] **[Verify]**    Run the completion check.
- [ ] **[Doc]**       Update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Decided]**
  Planned after reviewing support.webapp v0.5.1 for modules the app can reuse.
