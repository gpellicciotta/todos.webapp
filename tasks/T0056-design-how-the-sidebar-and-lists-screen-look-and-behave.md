---
id: T0056
owner: ~
needs: ['T0058']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: human
preview: none
protocol: standard
---
# T0056: Design how the sidebar and Lists screen look and behave with many lists, 100 and more.

## Goals
Design how the wide sidebar and the Lists screen look and behave with 100 or more lists.
Cover scrolling, finding a list, ordering with T0046, counts, keyboard use, and empty or filtered states.
Keep TEC-16: views open within 200 ms with 150 lists and 5000 tasks.
Write each decision into ui-design.md and its wireframes, and name the requirements to add.
Create the implementation tasks; this task changes no app code.
See technical-spec.md for constraints and the questions to decide.
Completion check: `python scripts/draw-wireframes.py docs/img/ui`, `python -m pytest tests`, and `ruff check scripts tests`.

## Task Execution Steps
- [ ] **[Read]**      Read Navigation Rules, Lists Overview, the wide layout, the User Menu, and requirements LST-5 and TEC-16.
- [ ] **[Decide]**    Decide how the sidebar behaves with 100 or more lists, using the questions in technical-spec.md.
- [ ] **[Decide]**    Decide how the Lists screen finds, orders, and renders 100 or more lists.
- [ ] **[Doc]**       Write the decisions into ui-design.md, and add the requirements to requirements.md.
- [ ] **[Doc]**       Redraw the wireframes with draw-wireframes.py, then run pytest and ruff on the scripts.
- [ ] **[Doc]**       Create the implementation tasks, including a 150-list render check, and update CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-07] **[Doc]**
  Companion task file written by hand: the plan CLI cannot scaffold a file for an existing task line.

- [2026-11-07] **[Decided]**
  Scope changed from the sidebar's scrolling to many lists everywhere: the user menu already holds Recycle bin and Settings.

- [2026-11-07] **[Review]**
  Review raised from agent to human.

