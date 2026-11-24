## Walkthrough & Validation

### Key Changes
- `log_entry` draws the item, a chip row with the time chip, the kind chip, and Open, then the values in a sunken box.
- Only the first entry offers Open, since the app shows Open only while the item still exists.
- The compact layout gained the intro, and the wide layout gained the retention note.
- Sunken boxes use the existing `bar` class, so the shared style and the other 17 wireframes stay unchanged.

### Red phase
Command: `python -m pytest -q tests/test_draw_wireframes.py -k sync_log` before the redraw (exit 1)

```text
>           assert "Values that sync overwrote or undid in the last 30 days." in labels
E           AssertionError: assert 'Values that sync overwrote or undid in the last 30 days.' in ['<', 'JD', 'Sync log', 'Overwritten value', 'Today 09:14', 'Buy paint for the hallway · Due time', ...]

tests\test_draw_wireframes.py:425: AssertionError
=========================== short test summary info ===========================
FAILED tests/test_draw_wireframes.py::test_sync_log_cards_show_the_item_then_time_and_kind_chips_then_sunken_details
1 failed, 126 deselected in 10.29s
```

### Green phase
Command: `python scripts/draw-wireframes.py docs/img/ui; python -m pytest -q tests/test_draw_wireframes.py` (exit 0)

```text
Wrote 18 wireframes to docs\img\ui
........................................................................ [ 56%]
.......................................................                  [100%]
127 passed in 0.62s
```

Command: `ruff check scripts/draw-wireframes.py tests/test_draw_wireframes.py; ruff format --check scripts/draw-wireframes.py tests/test_draw_wireframes.py` (exit 0)

```text
All checks passed!
2 files already formatted
```

### Visual check
The rendered SVG shows four cards in both layouts, with no clipped text or overlap.

- Before: [sync-log-before.png](sync-log-before.png)
- After: [sync-log-after.png](sync-log-after.png)
