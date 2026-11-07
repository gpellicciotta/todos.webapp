## Walkthrough & Validation

### Summary
- Added the circular user button and its panel ([user-menu.js](../../../src/js/ui/user-menu.js)), wired to the shared session.
- Removed the sync indicator and the Recycle bin and Settings entries from the sidebar and bottom bar.
- Added the `align: 'end'` option to the popover, with unit tests, and anchored panels before measuring their trigger.
- User feedback: Recycle bin and Settings in the panel are now secondary buttons with icons, and the wireframe draws real icons.
- Review round 3 approved with no blocking defects; its panel width finding was fixed afterwards, with a test proven red first.
- Review round 2 rejected the work: the bottom bar kept four grid columns for two items, and long names misaligned the panel. Both fixed, with e2e tests proven red first.
- Review round 1 (independent subagent): no blocking defects; fixed the aria-haspopup mismatch, weak tests, stale CSS comments, and a blank-name edge case.
- Updated the gallery, style guide, UI design, wireframes, service worker version, and CHANGELOG.md.
- Screenshots sit in this folder, for compact and wide, light and dark; the list is below.

### Red phase
`npx vitest run tests/unit/user-menu.test.js tests/unit/layout.test.js`, exit code 1:

```text
[... 84 lines omitted ...]
     39|     expect(root.querySelector('.user-panel [data-nav="bin"]').getAttri…
       |                                                              ^
     40|     expect(root.querySelector('.user-panel [data-nav="settings"]').has…
     41|     shell.update({ view: 'connect', viewKey: 'connect', params: {} }, …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  2 failed (2)
      Tests  3 failed | 1 passed (4)
   Start at  08:49:06
   Duration  1.16s (environment 88%, transform 5%, tests 4%, import 1%, worker 1%)
```

`python -m pytest tests/test_draw_wireframes.py -q (against the unmodified script)`, exit code 1:

```text
[... 287 lines omitted ...]
FAILED tests/test_draw_wireframes.py::test_has_background_and_two_labeled_frames[user-menu.svg]
FAILED tests/test_draw_wireframes.py::test_shapes_stay_inside_their_frame[user-menu.svg]
FAILED tests/test_draw_wireframes.py::test_uses_only_gray_colors[user-menu.svg]
FAILED tests/test_draw_wireframes.py::test_top_bar_ends_with_the_user_button
FAILED tests/test_draw_wireframes.py::test_navigation_holds_no_recycle_bin_or_settings_entry[all-tasks.svg]
FAILED tests/test_draw_wireframes.py::test_navigation_holds_no_recycle_bin_or_settings_entry[first-launch.svg]
FAILED tests/test_draw_wireframes.py::test_navigation_holds_no_recycle_bin_or_settings_entry[list-editor.svg]
FAILED tests/test_draw_wireframes.py::test_navigation_holds_no_recycle_bin_or_settings_entry[list.svg]
FAILED tests/test_draw_wireframes.py::test_navigation_holds_no_recycle_bin_or_settings_entry[lists.svg]
FAILED tests/test_draw_wireframes.py::test_navigation_holds_no_recycle_bin_or_settings_entry[task-editor.svg]
FAILED tests/test_draw_wireframes.py::test_navigation_holds_no_recycle_bin_or_settings_entry[view-options.svg]
12 failed, 43 passed in 0.72s
```

### Green phase
Final run, after review round 3.

`npx vitest run`, exit code 0:

```text
[... 3 lines omitted ...]

 Test Files  36 passed (36)
      Tests  731 passed (731)
   Start at  13:56:48
   Duration  8.43s (environment 69%, tests 20%, import 8%, worker 2%, transform 1%)

    Isolate  36 workers spawned · ~1.13s startup each (spawn + environment, per file)
             at least ~4.67s faster with isolate: false — reuses workers across files instead of one per file
```

`npx eslint .`, exit code 0: no output.

`python -m pytest -q`, exit code 0:

```text
.......................................................                  [100%]
55 passed in 0.45s
```

`npm run check:sw`, exit code 0:

```text
[... 1 lines omitted ...]
> todos-webapp@0.1.1-pre check:sw
> node scripts/check-sw-version.mjs

OK: 55 precached files match VERSION 2026-11-06.7.
```

`npx playwright test`, exit code 0:

```text
[... 133 lines omitted ...]
  ok  98 [chromium] › tests\e2e\list.spec.js:140:3 › List screen › a list of 300 tasks renders the rows in view, and moves and drags reach rows past them (TEC-16) (23.0s)

  131 passed (1.3m)
```

### Screenshots
- Before: [compact](before-compact-light.png) and [wide](before-wide-light.png).
- After, local: [compact](after-compact-light.png), [compact panel](after-compact-light-panel.png), [wide](after-wide-light.png), [wide panel](after-wide-light-panel.png).
- After, connected, dark: [compact panel](after-compact-dark-connected-panel.png) and [wide panel](after-wide-dark-connected-panel.png).
- After, session expired: [compact](after-compact-light-sign-in-needed.png) and [wide](after-wide-light-sign-in-needed.png).
- Capture check: no console errors, page errors, or 404s in any of the eight capture sessions.

### Not run
- `npm run test:perf`, since the change touches no list rendering.
