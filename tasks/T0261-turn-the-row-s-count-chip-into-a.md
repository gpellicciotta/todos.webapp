---
id: T0261
owner: ~
needs: [T0260]
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0261: Turn the row's count chip into a button opening a minus, count, plus popover for targets above 1

## Goals
Let users correct a count from the row: above target 1, the count chip opens a minus, count, plus popover.
- The chip moves out of the row's open link to a sibling button, since a link may not hold a button.
- The popover reuses the count stepper of T0258, with the same rules.
- It is read-only while cancelled; viewers see the chip as plain text.
- Rules and tests: [technical-spec.md](T0261-turn-the-row-s-count-chip-into-a/technical-spec.md).

## Task Execution Steps
- [ ] **[Read]**      Read T0257's signed-off brief, count-stepper.js, metaOf in task-list.js, and the vendored popover.js.
- [ ] **[Implement]** Author failing unit and e2e tests for the chip button, the popover, its keys, and re-rendering.
- [ ] **[Verify]**    Run the new tests and confirm they fail for the right reasons.
- [ ] **[Implement]** Implement the chip button and the popover with count-stepper.js and the vendored popover.
- [ ] **[Verify]**    Run the unit suite and the All tasks and gallery e2e specs and confirm they pass.
- [ ] **[Visual]**    Capture the chip and the open popover at wide and compact widths, in both themes.
- [ ] **[Doc]**       Update the Task Row section, the gallery, the style guide, and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-16] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-16] **[Doc]**
  Wrote goals, steps, and technical-spec.md from the status, count, and tab model agreed in T0257.

