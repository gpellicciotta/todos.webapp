---
id: T0009
owner: ~
needs: [T0008]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
---
# T0009: Build the app components with every state, and their gallery sections: task row, status button, navigation, and more

## Goals
Style the app-specific components in `src/css/app-components.css`, imported by style.css.
Cover the task row, status button and its four icons, sidebar, bottom navigation, sync indicator, editor panel, note thread, and empty state.
Draw the status and navigation icons as inline stroke SVGs on one 24 px grid.
Add gallery sections for each component, plus the task list and editor panel patterns.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read ui-design.md's Shared Components and the wireframes in docs/img/ui/.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write app-components.css and the icon sprite, and add the app gallery sections.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Link each component's gallery section from visual-style-guide.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

