## Walkthrough & Validation

Design task: no app code changed. New wireframes lists-many.svg and lists-find.svg, with tests written first.

### Tests failed before the wireframe code (2026-11-07)
```text
28 failed, 56 passed in 1.35s   (python -m pytest tests/test_draw_wireframes.py -q)
```

### python scripts/draw-wireframes.py docs/img/ui
```text
Wrote 15 wireframes to docs\img\ui
exit 0
```

### python -m pytest tests -q
```text
........................................................................ [ 50%]
.......................................................................  [100%]
143 passed in 85.12s (0:01:25)
exit 0
```

### ruff check scripts tests
```text
All checks passed!
exit 0
```
