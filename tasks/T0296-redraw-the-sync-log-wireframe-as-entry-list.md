---
id: T0296
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
# T0296: Redraw the Sync log wireframe as entry list cards with time and kind chips

## Goals
Redraw `sync-log.svg` in `scripts/draw-wireframes.py` to match the entry list cards T0293 shipped.
Each card shows the item first, then a time chip and a kind chip, an Open link, and the values in a sunken details box.
Keep the intro, the retention note, and the compact and wide layouts.
Completion check: `python -m pytest -q tests/test_draw_wireframes.py`.

### Declared Files
- scripts/draw-wireframes.py
- docs/img/ui/sync-log.svg

### Tests
- Unit: test_draw_wireframes.py still renders sync-log.svg without overlaps.
- Integration test: none (the wireframe is a static drawing with no runtime path).

Size estimate: 2 files, 60 lines

## Task Execution Steps
- [ ] **[Implement]** Redraw the Sync log cards in draw-wireframes.py and regenerate sync-log.svg.
- [ ] **[Verify]**    Run the wireframe tests and inspect the rendered sync-log.svg.
- [ ] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.
