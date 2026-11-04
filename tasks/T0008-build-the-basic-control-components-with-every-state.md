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
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write controls.css with every state, import it from style.css, and add the gallery sections.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [ ] **[Doc]**       Link each component's gallery section from visual-style-guide.md and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

- [2026-11-04] **[Verify]**
  Wrote gallery-controls.spec.js and extended tokens.test.js first; 8 unit and 8 end-to-end tests failed before controls.css existed.

- [2026-11-04] **[Implement]**
  Added controls.css with buttons, icon buttons, fields, choices, chips, filter chips, segmented controls, menus, popovers, dialogs, banners, and toasts, plus twelve gallery sections.
  - New tokens: active-bg, signal-active, backdrop, icon-size, icon-stroke.
  - Applied T0007 notes: single border-strong value, guarded ramp swatch grid.

- [2026-11-04] **[Implement]**
  Size note: 9 counted files and 1421 lines, above the large line but under three times the 700-line estimate.
  - Undeclared files: tokens.css, tokens.test.js, visual-style-gallery.js.

- [2026-11-04] **[Verify]**
  npm test, lint, and all 15 end-to-end tests pass; every control specimen is at least 44 px and shows a focus ring.

- [2026-11-04] **[Visual]**
  Captured the gallery at 390 and 1440 px in light and dark, before and after, with motion enabled.
  - [gallery-1440-light-before.png](T0008-build-the-basic-control-components-with-every-state/screenshots/gallery-1440-light-before.png).
  - [gallery-1440-light-after.png](T0008-build-the-basic-control-components-with-every-state/screenshots/gallery-1440-light-after.png).

- [2026-11-04] **[Doc]**
  Linked each control's gallery section from visual-style-guide.md and documented the new tokens and the quiet button variant.

