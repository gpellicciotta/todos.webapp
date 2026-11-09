---
id: T0214
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
# T0214: List the keyboard shortcuts in the About section of Settings

## Goals
Add a Keyboard shortcuts list to the About section of Settings, as `docs/specs/ui-design.md` already requires.
List only shortcuts that work today, so users can discover them, including Shift+Enter and Alt+Enter in the add field.
Completion check: `npm test && npm run test:e2e -- tests/e2e/bin-settings.spec.js && npm run check:sw`
Size estimate: 7 files, 140 lines
See the companion technical specification.

## Task Execution Steps
- [ ] **[Read]**      Read aboutSection in settings.js, its unit tests, and the Settings e2e spec.
- [ ] **[Visual]**    Capture before screenshots of About at 390 px and 1440 px, light and dark.
- [ ] **[Implement]** Author failing unit and e2e tests for the shortcut list per the technical spec.
- [ ] **[Verify]**    Run the new tests and record that they fail.
- [ ] **[Implement]** Render the shortcut list from one frozen array, and style kbd with existing tokens.
- [ ] **[Verify]**    Run unit tests, the Settings e2e spec, lint, and check:sw until they pass.
- [ ] **[Visual]**    Capture after screenshots, and confirm no console errors or horizontal scroll.
- [ ] **[Doc]**       Update the About entry in ui-design.md and add a CHANGELOG entry.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-09] **[Doc]**
  Companion task file scaffolded at task creation.
