---
id: T0008
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-04T01:35:11Z"
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0008: Build the basic control components with every state, and their gallery sections

## Goals
Style the basic controls of docs/specs/visual-style-guide.md in `src/css/controls.css`, imported by style.css.
Cover buttons, icon buttons, fields, chips, filter chips, segmented controls, radios, menus, popovers, dialogs, banners, and toasts.
Give each control every applicable state: default, hover, focus-visible, active, disabled, and error.
Add a gallery section per control showing every variant and state.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read the Components section of visual-style-guide.md and the tokens task's gallery.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write controls.css with every state, import it from style.css, and add the gallery sections.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Link each component's gallery section from visual-style-guide.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

