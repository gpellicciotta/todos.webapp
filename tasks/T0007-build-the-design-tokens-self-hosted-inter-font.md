---
id: T0007
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
# T0007: Build the design tokens, self-hosted Inter font faces, the style.css entry point, and the gallery token sections

## Goals
Turn the token groups of docs/specs/visual-style-guide.md into `src/css/tokens.css` with primitive and semantic tiers.
Pick the exact violet signal values so every text and background pair meets WCAG 2.2 AA in both themes.
Self-host Inter as one variable font with its OFL license, and add `fonts.css` and the `style.css` entry point.
Start `src/demo/visual-style-gallery.html` with every token group and a light, dark, and system theme switch.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [ ] **[Read]**      Read docs/specs/visual-style-guide.md and the UI guidelines' token and gallery rules.
- [ ] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [ ] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [ ] **[Implement]** Write tokens.css, fonts.css, style.css, and the gallery token sections with a theme switch.
- [ ] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [ ] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Link the stylesheet files from visual-style-guide.md, record the signal values, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

