## Walkthrough & Validation

### Summary
- Removed the top-bar More button and its menu from the shell.
- Added the `.fab` component, the `--layer-float` token, and its shell placement (fixed at the bottom end of the screen).
- The Lists view shows New list as that floating button, hides it while an editor is open, and keeps room under the rows.
- Added a Floating button gallery section, style guide and UI design updates, and redrew the wireframes (no top-bar dots, Lists with the button, no page-level dots in the task editor).
- Red phase: the unit and end-to-end tests ran against the previous commit plus the new tests.

### Red phase

`npx vitest run tests/unit/lists.test.js tests/unit/layout.test.js (previous commit plus new tests)`, exit code 1:

```text
[... 99 lines omitted ...]
     48|     expect(button.hidden).toBe(false);
       |                   ^
     49|     screen.update({ name: 'list-new', view: 'lists', editor: 'list', p…
     50|     expect(button.hidden).toBe(true);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  2 failed (2)
      Tests  4 failed | 5 passed (9)
   Start at  14:05:49
   Duration  1.41s (environment 73%, transform 16%, import 6%, tests 5%, worker 1%)
```

`npx playwright test tests/e2e/lists.spec.js (previous commit plus new tests)`, exit code 1:

```text
[... 124 lines omitted ...]
    test-results\lists-the-floating-New-lis-afb12-the-New-list-editor-is-open-chromium\trace.zip
    Usage:

        npx playwright show-trace test-results\lists-the-floating-New-lis-afb12-the-New-list-editor-is-open-chromium\trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  4 failed
    [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the compact layout 
    [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the wide layout 
    [chromium] › tests\e2e\lists.spec.js:109:1 › the floating New list button stays over the rows, and the last row scrolls clear of it 
    [chromium] › tests\e2e\lists.spec.js:140:1 › the floating New list button hides while the New list editor is open 
```

### Green phase

`npx vitest run`, exit code 0:

```text
[... 3 lines omitted ...]

 Test Files  37 passed (37)
      Tests  736 passed (736)
   Start at  14:03:47
   Duration  10.32s (environment 70%, tests 19%, import 8%, worker 2%, transform 1%)

    Isolate  37 workers spawned · ~1.42s startup each (spawn + environment, per file)
             at least ~6.10s faster with isolate: false — reuses workers across files instead of one per file
```

`npx eslint .`, exit code 0: no output.

`python -m pytest -q`, exit code 0:

```text
.........................................................                [100%]
57 passed in 0.48s
```

`npm run check:sw`, exit code 0:

```text
[... 1 lines omitted ...]
> todos-webapp@0.1.1-pre check:sw
> node scripts/check-sw-version.mjs

OK: 55 precached files match VERSION 2026-11-06.8.
```

`npx playwright test`, exit code 0:

```text
[... 138 lines omitted ...]
  ok  99 [chromium] › tests\e2e\list.spec.js:140:3 › List screen › a list of 300 tasks renders the rows in view, and moves and drags reach rows past them (TEC-16) (24.4s)

  136 passed (1.5m)
```

### Screenshots
- Before (the shell with the top-bar More button and the header New list button): [compact](before-lists-compact.png) and [wide](before-lists-wide.png).
- After: [compact](after-lists-compact.png), [wide](after-lists-wide.png), and [wide with the editor open](after-lists-wide-editor-open.png).
- After, dark: [compact](after-dark-lists-compact.png) and [wide](after-dark-lists-wide.png).
- Capture check: no console errors, page errors, or 404s in any capture session.

## Rework 1: circular plus-only button
User feedback: the pill read as an oval; make it a circle with only a plus sign. The button is now a 56 px signal circle, named New list through aria-label and title.

### Red phase
`npx vitest run tests/unit/lists.test.js`, exit code 1:

```text
[... 25 lines omitted ...]

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
   Start at  14:42:07
   Duration  1.09s (environment 77%, import 10%, transform 8%, tests 4%, worker 1%)
```

`python -m pytest tests/test_draw_wireframes.py -q`, exit code 1:

```text
[... 15 lines omitted ...]
E             + 390)

tests\test_draw_wireframes.py:167: AssertionError
=========================== short test summary info ===========================
FAILED tests/test_draw_wireframes.py::test_lists_float_new_list_and_no_screen_keeps_a_more_button_in_the_top_bar
1 failed, 57 passed in 0.51s
```

`npx playwright test tests/e2e/lists.spec.js tests/e2e/gallery-chrome.spec.js -g "floats|signal circle"`, exit code 1:

```text
[... 102 lines omitted ...]
    ────────────────────────────────────────────────────────────────────────────────────────────────

  3 failed
    [chromium] › tests\e2e\gallery-chrome.spec.js:120:1 › the floating button is a signal circle with a plus, a shadow, and a target of at least 44 px 
    [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the compact layout 
    [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the wide layout 
```

### Green phase
Final run, after review round 2 tidy-ups: sharper radius assertions, a tighter wireframe test, and row padding tied to the 56 px button.

`npx vitest run`, exit code 0:

```text
[... 3 lines omitted ...]

 Test Files  37 passed (37)
      Tests  747 passed (747)
   Start at  14:47:11
   Duration  8.18s (environment 69%, tests 20%, import 8%, transform 1%, worker 1%)

    Isolate  37 workers spawned · ~1.06s startup each (spawn + environment, per file)
             at least ~4.55s faster with isolate: false — reuses workers across files instead of one per file
```

`python -m pytest -q`, exit code 0:

```text
..........................................................               [100%]
58 passed in 0.50s
```

`npm run check:sw`, exit code 0:

```text
[... 2 lines omitted ...]
> node scripts/check-sw-version.mjs

OK: 55 precached files match VERSION 2026-11-06.12.
```

`npx playwright test`, exit code 0:

```text
[... 144 lines omitted ...]
  ok 141 [chromium] › tests\e2e\task-editor.spec.js:173:1 › a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5) (3.1s)

  142 passed (1.4m)
```

`npx eslint .`, exit code 0: no output.

### Screenshots
The After screenshots above were recaptured with the circular button, so they show the final state.
