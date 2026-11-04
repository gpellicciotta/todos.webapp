---
id: T0031
owner: ~
needs: [T0009]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0031: Build the app chrome components and gallery sections: navigation, sync indicator, editor panel, note thread, and empty state

## Goals
Style the sidebar and bottom navigation, sync indicator, editor panel shell, note thread, and empty state.
Put them in `src/css/app-chrome.css`, imported by style.css, with gallery sections and the editor panel pattern.
Split from T0009 on 2026-11-04 for size; the code was written during T0009.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read the chrome styles and gallery sections written during T0009, and their wireframes.
- [ ] **[Implement]** Take over the failing integration tests for the chrome gallery sections.
- [ ] **[Verify]**    Run the tests without the chrome styles, confirm they fail, and record the output.
- [ ] **[Implement]** Take over app-chrome.css and the chrome gallery sections.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Link each chrome component's gallery section from visual-style-guide.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.
