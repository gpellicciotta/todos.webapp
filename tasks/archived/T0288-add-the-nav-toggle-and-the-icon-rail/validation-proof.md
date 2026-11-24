## Walkthrough & Validation

Red phase, on the base commit with the new tests and the old script:

`python -m pytest tests/test_draw_wireframes.py -q` (exit code 1, FAILED lines and summary kept):

```text
FAILED tests/test_draw_wireframes.py::test_writes_every_screen - AssertionErr...
FAILED tests/test_draw_wireframes.py::test_has_background_and_two_labeled_frames[nav-rail.svg]
FAILED tests/test_draw_wireframes.py::test_shapes_stay_inside_their_frame[nav-rail.svg]
FAILED tests/test_draw_wireframes.py::test_uses_only_gray_colors[nav-rail.svg]
FAILED tests/test_draw_wireframes.py::test_output_matches_the_committed_wireframes
FAILED tests/test_draw_wireframes.py::test_every_wide_frame_starts_with_the_nav_toggle[all-tasks.svg]
FAILED tests/test_draw_wireframes.py::test_every_wide_frame_starts_with_the_nav_toggle[connect.svg]
FAILED tests/test_draw_wireframes.py::test_every_wide_frame_starts_with_the_nav_toggle[first-launch.svg]
FAILED tests/test_draw_wireframes.py::test_every_wide_frame_starts_with_the_nav_toggle[import.svg]
FAILED tests/test_draw_wireframes.py::test_every_wide_frame_starts_with_the_nav_toggle[list-editor.svg]
FAILED tests/test_draw_wireframes.py::test_every_wide_frame_starts_with_the_nav_toggle[list.svg]
FAILED tests/test_draw_wireframes.py::test_every_wide_frame_starts_with_the_nav_toggle[lists-find.svg]
[... 15 lines omitted ...]
27 failed, 99 passed in 10.39s
```

Green phase, after the change and `python scripts/draw-wireframes.py docs/img/ui`:

`python -m pytest tests/test_draw_wireframes.py -q` (exit code 0):

```text
........................................................................ [ 57%]
......................................................                   [100%]
126 passed in 0.66s
```

Completion check, `python scripts/devops.py check` (exit code 0):

```text
Command: "C:\Program Files\nodejs\node.EXE" scripts/check-sw-version.mjs
Process ID: 36684
OK: 151 precached files match VERSION 2026-11-24.3.
Command: "C:\Program Files\nodejs\node.EXE" src/vendor/design/bin/check.mjs
Process ID: 26304
integrity: PASS
conformance: PASS
Command: "C:\Program Files\nodejs\npm.CMD" test
Process ID: 12120
> todos-webapp@0.5.1-pre test
> vitest run
 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0288-add-the-nav-toggle-and-the-icon-rail
 Test Files  67 passed (67)
      Tests  1789 passed (1789)
   Start at  13:32:29
   Duration  17.35s (tests 46%, environment 41%, import 9%, transform 2%, worker 1%, setup 1%)
    Isolate  67 workers spawned · ~894ms startup each (spawn + environment, per file)
             at least ~7.66s faster with isolate: false — reuses workers across files instead of one per file
Command: "C:\Program Files\nodejs\npm.CMD" run lint
Process ID: 6444
> todos-webapp@0.5.1-pre lint
> eslint .
Command: "C:\Program Files\nodejs\npm.CMD" run test:e2e
Process ID: 6744
> todos-webapp@0.5.1-pre test:e2e
> playwright test
Running 276 tests using 4 workers
[... 278 lines omitted ...]
Process ID: 24364
All checks passed!
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m ruff format --check scripts tests
Process ID: 36120
4 files already formatted
Command: C:\Users\giova\AppData\Local\Programs\Python\Python315\python.exe -m pytest -q tests
Process ID: 9596
........................................................................ [ 33%]
........................................................................ [ 66%]
.......................................................................  [100%]
215 passed in 101.74s (0:01:41)
```

Visual check: the SVGs were rendered with Playwright Chromium and inspected.

- Before: [all-tasks](before-all-tasks.png), [lists-many](before-lists-many.png).
- After: [all-tasks](after-all-tasks.png), [lists-many](after-lists-many.png), [import](after-import.png), [nav-rail](after-nav-rail.png).
