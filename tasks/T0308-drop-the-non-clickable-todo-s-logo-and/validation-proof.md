## Walkthrough & Validation

Omitted lines include the lines that hold local file-system paths.

### Red Phase

`npx vitest run tests/unit/layout.test.js tests/unit/app-icons.test.js`, exit 1:

```text
[... 5 lines omitted ...]
     × leave the sidebar of the app, the gallery, and the app styles without a brand 10ms
[... 2 lines omitted ...]
     × starts the sidebar with the destinations, without a logo or app name 14ms
[... 739 lines omitted ...]
 Test Files  2 failed (2)
      Tests  2 failed | 48 passed (50)
[... 3 lines omitted ...]
```

`python scripts/devops.py test tests/test_draw_wireframes.py`, exit 1:

```text
[... 211 lines omitted ...]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[all-tasks.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[connect.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[first-launch.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[import.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[list-editor.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[list.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[lists-find.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[lists-many.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[lists.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[recycle-bin.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[settings.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[sync-log.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[task-editor-history.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[task-editor-status.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[task-editor.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[user-menu.svg]
FAILED tests/test_draw_wireframes.py::test_sidebar_has_no_app_name[view-options.svg]
17 failed, 128 passed in 1.01s
**[ERROR]** Finished devops test in 1.4s with status: failed
```

### Green Phase

`python scripts/devops.py check`, exit 0: service worker, design, unit, and lint checks.

```text
[... 2 lines omitted ...]
OK: 158 precached files match VERSION 2026-11-28.1.
[... 9 lines omitted ...]
 Test Files  68 passed (68)
      Tests  1824 passed (1824)
[... 7 lines omitted ...]
> eslint .
[... 3 lines omitted ...]
```

End-to-end part of the same run:

```text
> playwright test
[... 302 lines omitted ...]
  283 passed (3.9m)
```

Python part of the same run:

```text
[... 2 lines omitted ...]
All checks passed!
[... 2 lines omitted ...]
4 files already formatted
[... 6 lines omitted ...]
234 passed in 117.59s (0:01:57)
```

### Screenshots

The capture scripts exited 0 and printed:

```text
no console errors, page errors, or failed requests
no console errors, page errors, or HTTP errors
```
