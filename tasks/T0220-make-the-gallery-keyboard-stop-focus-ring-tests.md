---
id: T0220
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
# T0220: Make the gallery keyboard-stop focus ring tests fast enough to pass under parallel load

## Goals
Six gallery e2e tests Tab through the gallery and check a focus ring on every stop.
Measured alone, they took 10.8-17.6 s against the 30 s limit, so they time out under load.
T0214 hit this in two full runs while another session ran its own tests.
Make each one take under 8 s alone, with the same coverage, so load no longer fails them.
Completion check: npx playwright test tests/e2e/gallery-controls.spec.js tests/e2e/gallery-app.spec.js tests/e2e/gallery-chrome.spec.js
Size estimate: 4 files, 120 lines
Technical specifications: [technical-spec.md](T0220-make-the-gallery-keyboard-stop-focus-ring-tests/technical-spec.md)

## Task Execution Steps
- [ ] **[Verify]**    Record each test's time alone, and its failures under `--repeat-each=3 --workers=6`, as red-phase proof.
- [ ] **[Verify]**    Break one specimen's focus ring locally and confirm all affected tests fail, naming that stop.
- [ ] **[Implement]** Add the shared focus-stop helper and use it in the three gallery specs.
- [ ] **[Verify]**    Rerun the timing and load runs, the broken-ring check, lint, and the full e2e suite.
- [ ] **[Doc]**       Paste the before and after times into validation-proof.md; test-only, so no CHANGELOG entry.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-10] **[Doc]**
  Companion task file scaffolded at task creation.
