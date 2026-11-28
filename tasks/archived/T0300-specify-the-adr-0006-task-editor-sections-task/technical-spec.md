Source: [ADR-0006](https://github.com/gpellicciotta/todos.server/blob/main/docs/adrs/ADR-0006-tasks-as-goals-with-windows-and-a-log.md) of todos.server.

### Declared Files
- docs/specs/ui-design.md
- docs/requirements.md
- scripts/draw-wireframes.py
- docs/specs/visual-style-guide.md
- tests/test_draw_wireframes.py

Mechanical command: python scripts/draw-wireframes.py
Mechanical files: docs/img/ui/*.svg

### Tests
- Unit: tests/test_draw_wireframes.py passes with the updated wireframes.
- Integration test: none (documentation and wireframes only)

Completion check: `pytest tests/test_draw_wireframes.py` passes, `lint-markdown check docs/specs/ui-design.md docs/requirements.md` passes, and the review approves.
Size estimate: 3 files, 350 lines
Size note: The user's wireframe review added the tab split, status icons, colors, and Show upcoming; one interface, one design pass, so no split.

### Design Decisions
The user settled the open ADR-0006 interface choices on 2026-11-27 and 2026-11-28, reviewing a preview canvas.
ui-design.md records each as **[Decided]**: the four editor tabs, read-only status, the Danger zone, colors, on track, and Show upcoming.
