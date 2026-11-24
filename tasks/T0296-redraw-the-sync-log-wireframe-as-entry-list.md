---
id: T0296
owner: "@claude-code"
needs: []
branch: —
worktree: —
status: active
started_at: "2026-11-24T15:01:41Z"
ended_at: —
review: agent
preview: none
protocol: adhoc
review_status: pending
review_round: 1
review_requested_at: "2026-11-24T15:05:20Z"
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
- tests/test_draw_wireframes.py

Mechanical command: `python scripts/draw-wireframes.py docs/img/ui`
Mechanical files: docs/img/ui/sync-log.svg

### Tests
- Unit: test_draw_wireframes.py still renders sync-log.svg without overlaps.
- Unit: a new test checks the item, the chip row with Open, and the sunken details box.
- Integration test: none (the wireframe is a static drawing with no runtime path).

Size estimate: 2 files, 60 lines

## Task Execution Steps
- [x] **[Implement]** Redraw the Sync log cards in draw-wireframes.py and regenerate sync-log.svg.
- [x] **[Verify]**    Run the wireframe tests and inspect the rendered sync-log.svg.
- [x] **[Doc]**       Update documentation and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-24] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-24] **[Verify]**
  Redrew the Sync log cards; wireframe tests and Ruff pass; before and after renders are in the companion directory.
  - Before: [sync-log-before.png](T0296-redraw-the-sync-log-wireframe-as-entry-list/sync-log-before.png).
  - After: [sync-log-after.png](T0296-redraw-the-sync-log-wireframe-as-entry-list/sync-log-after.png).

- [2026-11-24] **[Verify]**
  Recorded task outcomes.
  - Files touched: 2.
  - Lines touched: 83.
  - Reopenings: 0.

- [2026-11-24] **[Review]**
  Round 1 requested (mode: agent).

