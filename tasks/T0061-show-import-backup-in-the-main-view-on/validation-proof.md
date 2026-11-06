## Walkthrough & Validation

### Summary
- On compact layouts, Import backup opens non-modally in the app root, in the main column between the bars, with a ruled header and no scrim.
- A route change cancels it unless the import is running; Escape and the close button cancel it; Tab is not trapped.
- Wide layouts keep the modal dialog.
- Added `modal: false` to `openDialog`, the `.dialog--in-view` style and gallery specimen, and redrew import.svg.
- Red phase: the unit tests ran against the previous commit (new tests only); the compact end-to-end spec ran before the change.
- Review round 1 approved. Its two non-blocking findings were fixed afterwards: the covered main column is now inert while the import is open, and growing the window to the wide layout cancels it. Both have tests, run red first.

### Red phase

`npx vitest run tests/unit/dialog.test.js tests/unit/import-dialog.test.js (new tests, before the change)`, exit code 1:

```text
[... 256 lines omitted ...]
    145|     expect(remove).toHaveBeenCalledWith('hashchange', expect.any(Funct…
       |                    ^
    146|   });
    147|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  2 failed (2)
      Tests  5 failed | 16 passed (21)
   Start at  14:12:36
   Duration  6.67s (tests 71%, environment 26%, transform 2%, import 1%)
```

`npx playwright test tests/e2e/backup.spec.js -g compact (before the change)`, exit code 1:

```text
[... 25 lines omitted ...]

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results\backup-on-a-compact-layout-ce03f-ars-and-the-bars-still-work-chromium\trace.zip
    Usage:

        npx playwright show-trace test-results\backup-on-a-compact-layout-ce03f-ars-and-the-bars-still-work-chromium\trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  1 failed
    [chromium] › tests\e2e\backup.spec.js:110:1 › on a compact layout Import backup fills the main view between the bars, and the bars still work 
  2 passed (3.5s)
```

`python -m pytest tests/test_draw_wireframes.py (previous script, new test)`, exit code 1:

```text
[... 8 lines omitted ...]
        compact = groups[0]
        rects = [
            (float(r.get("x")), float(r.get("y")), float(r.get("width")), float(r.get("height")))
            for r in compact.iter(f"{SVG}rect")
        ]
>       assert (0.0, 60.0, 390.0, 720.0) in rects
E       assert (0.0, 60.0, 390.0, 720.0) in [(0.0, 0.0, 390.0, 844.0), (0.0, 0.0, 390.0, 60.0), (12.0, 72.0, 366.0, 100.0), (28.0, 116.0, 334.0, 40.0), (30.0, 118.0, 107.333, 36.0), (12.0, 184.0, 366.0, 100.0), ...]

tests\test_draw_wireframes.py:180: AssertionError
=========================== short test summary info ===========================
FAILED tests/test_draw_wireframes.py::test_import_wireframe_fills_the_compact_main_view_between_the_bars
1 failed, 57 passed in 0.83s
```

`npx vitest run tests/unit/import-dialog.test.js (inert and resize tests, before the fix)`, exit code 1:

```text
[... 41 lines omitted ...]
    144|     expect(media.listeners.size).toBe(1);
       |                                  ^
    145|     media.cross(false);
    146|     await expect(closed).resolves.toBeNull();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 11 passed (13)
   Start at  14:23:46
   Duration  1.43s (environment 69%, tests 20%, transform 6%, import 4%, worker 1%)
```

### Green phase

`npx vitest run`, exit code 0:

```text
[... 3 lines omitted ...]

 Test Files  37 passed (37)
      Tests  747 passed (747)
   Start at  14:25:27
   Duration  10.59s (environment 69%, tests 19%, import 8%, transform 2%, worker 1%)

    Isolate  37 workers spawned · ~1.39s startup each (spawn + environment, per file)
             at least ~5.96s faster with isolate: false — reuses workers across files instead of one per file
```

`npx eslint .`, exit code 0: no output.

`python -m pytest -q`, exit code 0:

```text
..........................................................               [100%]
58 passed in 0.66s
```

`npm run check:sw`, exit code 0:

```text
[... 1 lines omitted ...]
> todos-webapp@0.1.1-pre check:sw
> node scripts/check-sw-version.mjs

OK: 55 precached files match VERSION 2026-11-06.10.
```

`npx playwright test`, exit code 0:

```text
[... 144 lines omitted ...]
  ok 142 [chromium] › tests\e2e\task-editor.spec.js:205:1 › Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6) (3.5s)

  142 passed (1.5m)
```

### Screenshots
- Before: [compact](before-import-compact.png) and [wide](before-import-wide.png).
- After: [compact](after-import-compact.png), [compact with a file](after-file-import-compact.png), [wide](after-import-wide.png).
- After, dark: [compact](after-dark-import-compact.png) and [wide](after-dark-import-wide.png).
- Capture check: no console errors, page errors, or 404s in any capture session.
