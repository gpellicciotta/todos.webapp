Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- docs/specs/ui-design.md
- docs/requirements.md
- scripts/draw-wireframes.py

Mechanical command: python scripts/draw-wireframes.py
Mechanical files: docs/img/ui/*.svg

### Tests
- Unit: tests/test_draw_wireframes.py passes with the updated wireframes.
- Integration test: none (documentation and wireframes only)

Completion check: `pytest tests/test_draw_wireframes.py` passes, `lint-markdown check docs/specs/ui-design.md docs/requirements.md` passes, and the review approves.
Size estimate: 3 files, 350 lines
