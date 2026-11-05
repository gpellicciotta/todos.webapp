---
id: T0009
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: completed
started_at: "2026-11-04T14:45:53Z"
ended_at: "2026-11-04T15:19:28Z"
review: agent
preview: none
protocol: standard
review_status: approved
review_round: 1
reviewed_by: "@claude-review-agent"
completion-commit: 6801a5cfeca85d41c432cdebae0f9fee57cf7082
---
# T0009: Build the task row, status button, and status menu components with every state, and their gallery sections

## Goals
Style the task row, status button with its four icons, and status menu in `src/css/app-components.css`.
Add the shared icon sprite, and gallery sections for these components and the task list pattern.
Split on 2026-11-04 for size: navigation, sync indicator, editor panel, note thread, and empty state moved to T0031.
See technical-spec.md for decisions, files, size, and tests.

## Task Execution Steps
- [x] **[Read]**      Read ui-design.md's Shared Components and the wireframes in docs/img/ui/.
- [x] **[Implement]** Write the failing unit and integration tests listed in technical-spec.md.
- [x] **[Verify]**    Run the new tests, confirm they fail as expected, and record the output in validation-proof.md.
- [x] **[Implement]** Write app-components.css and the icon sprite, and add the app gallery sections.
- [x] **[Verify]**    Run the completion check and record its verbatim output in validation-proof.md.
- [x] **[Visual]**    Capture before and after screenshots at 390 and 1440 px in light and dark themes.
- [x] **[Doc]**       Link each component's gallery section from visual-style-guide.md and update CHANGELOG.md.
- [x] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-04] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-04] **[Review]**
  Review raised from agent to human.

- [2026-11-04] **[Review]**
  Review lowered from human to agent by @gpellicciotta: The user authorized agent review for all v0.1.0 tasks on 2026-11-04, to work without waiting for each review..

- [2026-11-04] **[Decided]**
  Icons use one sprite, src/img/icons.svg, via external use references; task rows respond to their list width through a container query.

- [2026-11-04] **[Implement]**
  Added app-components.css, the icon sprite, three non-color tokens, and seven component plus two pattern gallery sections.
  - Tokens: --radius-round, --width-chip-max, --duration-spin.
  - Undeclared files: tokens.css, tokens.test.js, visual-style-gallery.css.

- [2026-11-04] **[Verify]**
  npm test, lint, and all 35 end-to-end tests pass, including the 17 new app gallery tests.

- [2026-11-04] **[Visual]**
  Captured the gallery at 390 and 1440 px in light and dark, before and after, with motion enabled.
  - [gallery-390-light-before.png](T0009-build-the-app-components-with-every-state-and/screenshots/gallery-390-light-before.png).
  - [gallery-390-light-after.png](T0009-build-the-app-components-with-every-state-and/screenshots/gallery-390-light-after.png).

- [2026-11-04] **[Review]**
  Size note: 9 counted files, 2161 lines, above the large line and three times the 700-line estimate; human sign-off needed.
  - Gallery markup adds 755 lines; app-components.css adds 766 lines.

- [2026-11-04] **[Decided]**
  Icons use one sprite, src/img/icons.svg, via external use references; task rows respond to their list width through a container query.

- [2026-11-04] **[Implement]**
  Added app-components.css, the icon sprite, --width-chip-max, and the status button, task row, and task list gallery sections.
  - Undeclared files: tokens.css, tokens.test.js, visual-style-gallery.css.

- [2026-11-04] **[Verify]**
  On a T0009-only tree, npm test, lint, and all 33 end-to-end tests pass, including 15 task row gallery tests.
  - Shared-file versions: scratchpad t0009-only folder, for a separate commit.

- [2026-11-04] **[Visual]**
  Captured the gallery at 390 and 1440 px in light and dark, before and after, with motion enabled.
  - [gallery-390-light-before.png](T0009-build-the-app-components-with-every-state-and/screenshots/gallery-390-light-before.png).
  - [gallery-390-light-after.png](T0009-build-the-app-components-with-every-state-and/screenshots/gallery-390-light-after.png).

- [2026-11-04] **[Review]**
  Size note: after the split, 9 counted files and 1224 lines, above the large line but under three times the estimate.
  - Rows, status components, and their gallery sections must merge together.

- [2026-11-04] **[Review]**
  Agent review approved the split T0009; minor row findings were recorded as follow-ups in T0016.

- [2026-11-04] **[Verify]**
  Recorded task outcomes.
  - Files touched: 10.
  - Lines touched: 1225.
  - Reopenings: 0.

- [2026-11-04] **[Review]**
  Round 1 requested (mode: agent).

- [2026-11-04] **[Review]**
  Round 1 approved by @claude-review-agent.

- [2026-11-04] **[Complete]**
  Task completed successfully.

