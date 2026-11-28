## Walkthrough & Validation
Work ran in a separate worktree on `task/T0300-specify-the-adr-0006-task-editor-sections-task`, rebased on `a7956d0`.
The user chose that worktree because the primary checkout held uncommitted add bar work.

### Red Phase
The new wireframe tests failed before the script changed.
Command: `python -m pytest tests/test_draw_wireframes.py -q -p no:cacheprovider`, exit code 1.

```text
[... 1118 lines omitted ...]
    def test_in_progress_icon_fills_the_bottom_half():
        module = load_script()
        frame = module.Frame(100, 100)
        module.status_icon(frame, 50, 50, "in-progress")
>       assert '<path d="M41 50 A9 9 0 0 0 59 50 Z" class="icon-fill"/>' in frame.items
E       assert '<path d="M41 50 A9 9 0 0 0 59 50 Z" class="icon-fill"/>' in ['<rect x="0" y="0" width="100" height="100" rx="0" class="frame"/>', '<circle cx="50" cy="50" r="9" class="icon"/>', '<path d="M50 41 A9 9 0 0 1 50 59 Z" class="icon-fill"/>']
E        +  where ['<rect x="0" y="0" width="100" height="100" rx="0" class="frame"/>', '<circle cx="50" cy="50" r="9" class="icon"/>', '<path d="M50 41 A9 9 0 0 1 50 59 Z" class="icon-fill"/>'] = <draw_wireframes.Frame object at 0x000001D68D4D9E80>.items

[... 326 lines omitted ...]
=========================== short test summary info ===========================
FAILED tests/test_draw_wireframes.py::test_writes_every_screen - AssertionErr...
FAILED tests/test_draw_wireframes.py::test_has_background_and_two_labeled_frames[quick-log.svg]
FAILED tests/test_draw_wireframes.py::test_has_background_and_two_labeled_frames[task-editor-configuration.svg]
FAILED tests/test_draw_wireframes.py::test_has_background_and_two_labeled_frames[task-editor-notes.svg]
FAILED tests/test_draw_wireframes.py::test_shapes_stay_inside_their_frame[quick-log.svg]
[... 37 lines omitted ...]
42 failed, 130 passed in 1.97s
exit=1
```

### Green Phase
Command: `python scripts/draw-wireframes.py docs/img/ui`, exit code 0.

```text
Wrote 20 wireframes to docs\img\ui
```

Command: `python -m pytest tests/test_draw_wireframes.py -q -p no:cacheprovider`, exit code 0.

```text
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed in 0.69s
```

Command: `lint-markdown check --offline docs/specs/ui-design.md docs/requirements.md`, exit code 0.

```text
All 2 markdown files passed linting.
```

The online run also reports two external links in requirements.md that predate this task.
GitHub answered HTTP 429 for the todos REST spec link and HTTP 404 for the family-portal link.

### Review Round 1 Fixes
Codex rejected round 1 with five blocking ADR-0006 conflicts; commit `b90fe5c` fixes them.
Command: `python -m pytest tests/test_draw_wireframes.py -q -p no:cacheprovider`, exit code 0.

```text
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed in 0.70s
```

Command: `lint-markdown check --offline docs/specs/ui-design.md docs/requirements.md`, exit code 0.

```text
All 2 markdown files passed linting.
```

### Review Round 2 Fixes
Codex rejected round 2 for stale style guide text and a missing Amount log field; commit `56b712e` fixes them.
The style guide's line 9 link to support.webapp resolves only from the primary checkout, where its lint passes.
Command: `python -m pytest tests/test_draw_wireframes.py -q -p no:cacheprovider`, exit code 0.

```text
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed in 0.73s
```

Command: `lint-markdown check --offline docs/specs/ui-design.md docs/requirements.md`, exit code 0.

```text
All 2 markdown files passed linting.
```

### Review Round 3 Fixes
Codex rejected round 3 for at-most readings without any reading and Cancel task on closed tasks; commit `fa3c0a3` fixes them.
Command: `python -m pytest tests/test_draw_wireframes.py -q -p no:cacheprovider`, exit code 0.

```text
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed in 1.09s
```

Command: `lint-markdown check --offline docs/specs/ui-design.md docs/requirements.md`, exit code 0.

```text
All 2 markdown files passed linting.
```

### Review Round 4 Fix
Codex rejected round 4 for the Unmark started condition; commit `1139d33` fixes it.
The user chose to apply this fix and complete the task without a fifth Codex round.
Command: `python -m pytest tests/test_draw_wireframes.py -q -p no:cacheprovider`, exit code 0.

```text
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed in 1.02s
```

Command: `lint-markdown check --offline docs/specs/ui-design.md docs/requirements.md`, exit code 0.

```text
All 2 markdown files passed linting.
```

### Wireframe Screenshots
Rendered from the SVG files with Playwright Chromium; wireframes stay gray by design.
- Before: [task editor Content](before-task-editor.png), [task editor Status](before-task-editor-status.png), [view options](before-view-options.png), [All tasks](before-all-tasks.png), and [list](before-list.png).
- After: [Status](after-task-editor.png), [Notes](after-task-editor-notes.png), [Configuration](after-task-editor-configuration.png), and [History](after-task-editor-history.png).
- After: [view options](after-view-options.png), [All tasks](after-all-tasks.png), [list](after-list.png), and [quick log](after-quick-log.png).
