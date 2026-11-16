---
id: T0257
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
# T0257: Design a tabbed task editor and a clearer status and count interaction, with wireframes and human sign-off

## Goals
Produce a signed-off design for a tabbed task editor and a status interaction users understand.
- Tabs: a) description, lists, and notes; b) status, dates, and recurrence; c) history.
- Today a tick at 2 of 3 cannot be taken back, while 3 of 3 can be unticked; the design must make counts reversible.
- The user reports 2 of 3 looking completed at target 3; confirm whether that is a rendering bug.
- Run a brainstorming session with the user, then wireframe the chosen direction.
- Deliverables: an updated Task Editor section, wireframes, and implementation tasks filed after sign-off.
- Design only: no app code changes. Brief: [technical-spec.md](T0257-design-a-tabbed-task-editor-and-a-clearer/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read the Task Editor design, task-editor.js, the tick rules in task-list.js, and occurrences.js.
- [ ] **[Read]**      Reproduce the 2 of 3 report and record whether the row or editor shows it as completed.
- [ ] **[Decide]**    Hold a brainstorming session with the user on tabs, status controls, and counts.
- [ ] **[Doc]**       Draft two or three status interaction options with small sketches for the user to choose from.
- [ ] **[Doc]**       Wireframe the chosen editor in draw-wireframes.py, at desktop panel and phone widths.
- [ ] **[Doc]**       Update the Task Editor section of the UI design and the affected requirements.
- [ ] **[Review]**    Obtain the user's sign-off on the wireframes and the design text.
- [ ] **[Doc]**       File the implementation tasks, each within the size lines, and link them here.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Review]**
  Review raised from agent to human.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and the design brief from the user's editor and status feedback.
