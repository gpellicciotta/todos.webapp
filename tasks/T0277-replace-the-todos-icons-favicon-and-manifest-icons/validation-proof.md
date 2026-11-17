## Walkthrough & Validation
Icons come from support.webapp tag `v0.2.0`, the first tag after v0.1.0, which satisfies "v0.1.1 or later".
`git hash-object` of every copied file matches the `v0.2.0` blob; the SVG matches after Git's LF normalization.

### Red phase
`npx vitest run tests/unit/app-icons.test.js`, exit 1:

```text
     × lists the dimensional any and maskable PNGs at 192 and 512 px, without an SVG entry 12ms
     × points at PNG files of the declared size 3ms
     × links favicon.ico, the flat SVG, and the dimensional apple touch icon 23ms
     × serves an ICO favicon, an SVG with the Lucide ISC notice, and a 180 px touch icon 1ms
     × show the flat SVG in the sidebar brand of the app and the gallery 3ms
     × use the flat 192 px PNG for the sign-in logo and reminder notifications 4ms
     × holds every icon of the head, the manifest, and the in-app logos 14ms
     × is gone with its render script, and nothing names it 1ms
     × leaves the Lucide notice in the repository notices, since PNG copies cannot carry it 1ms
 Test Files  1 failed (1)
      Tests  9 failed (9)
```

`npx playwright test tests/e2e/pwa.spec.js -g "every icon"`, exit 1:

```text
  x  1 [chromium] › tests\e2e\pwa.spec.js:53:1 › every icon of the head, the manifest, and the logos loads online and offline (1.6s)
    Expected value: "favicon.ico"
    Received array: ["img/app-icon.svg", "img/app-icon-192.png", "img/app-icon.svg", "img/app-icon-192.png", "img/app-icon-512.png", "img/app-icon.svg", "img/todos-icon-192.png", "img/todos-icon-128.png"]
  1 failed
```

### Green phase
`npx vitest run tests/unit/app-icons.test.js tests/unit/precache.test.js tests/unit/session.test.js`, exit 0:

```text
 Test Files  3 passed (3)
      Tests  32 passed (32)
```

`npx playwright test tests/e2e/pwa.spec.js`, exit 0:

```text
  ok 3 [chromium] › tests\e2e\pwa.spec.js:84:1 › the manifest is served with its type and makes the app installable (2.2s)
  ok 1 [chromium] › tests\e2e\pwa.spec.js:53:1 › every icon of the head, the manifest, and the logos loads online and offline (2.7s)
  ok 2 [chromium] › tests\e2e\pwa.spec.js:35:1 › after one online visit the app reloads and navigates offline (2.8s)

  3 passed (4.4s)
```

### Completion check
`python scripts/devops.py check`, exit 1, failing only on 3 e2e tests that fail identically on `main`:

```text
OK: 138 precached files match VERSION 2026-11-17.33.
 Test Files  66 passed (66)
      Tests  1756 passed (1756)
[... ESLint clean and 260 passing e2e lines omitted ...]
  ok 200 [chromium] › tests\e2e\pwa.spec.js:53:1 › every icon of the head, the manifest, and the logos loads online and offline (2.9s)
  x   47 [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes (1.4s)
  x   64 [chromium] › tests\e2e\bin-settings.spec.js:296:3 › Keyboard shortcuts section lists them at wide width without a horizontal scroll (6.6s)
  x   65 [chromium] › tests\e2e\bin-settings.spec.js:296:3 › Keyboard shortcuts section lists them at compact width without a horizontal scroll (7.0s)
  3 failed
  263 passed (3.6m)
**[ERROR]** Finished devops check in 246.6s with status: failed
```

Same 3 specs on the untouched `main` checkout at `1ee04e2`, exit 1; T0282 tracks them:

```text
  3 failed
    [chromium] › tests\e2e\behaviors-dialog.spec.js:77:3 › toast behavior › keyboard alone shows a toast, reaches its Undo, and undoes
    [chromium] › tests\e2e\bin-settings.spec.js:296:3 › Keyboard shortcuts section lists them at wide width without a horizontal scroll
    [chromium] › tests\e2e\bin-settings.spec.js:296:3 › Keyboard shortcuts section lists them at compact width without a horizontal scroll
```

The check stops at e2e, so `python scripts/devops.py lint` and `python -m pytest -q` ran separately; both fail on `main` too.
`ruff format --check .` on `main`, exit 1 (T0284), the same file as in this branch's lint run:

```text
   --> tests\test_draw_wireframes.py:207:28
1 file would be reformatted, 15 files already formatted
```

`python -m pytest -q`, exit 1 here; `pytest tests/test_devops.py -k release` on `main` shows the same 3 failures (T0285):

```text
FAILED tests/test_devops.py::test_cli_release_dry_run_in_a_scratch_project_changes_nothing
FAILED tests/test_devops.py::test_the_release_action_runs_the_project_release_override_with_every_option
FAILED tests/test_devops.py::test_the_release_action_keeps_no_github_release_as_an_alias
3 failed, 186 passed in 85.61s (0:01:25)
```

### Visual verification
A Playwright capture script loads the app at 1280 px in light and dark, at 390 px, and the gallery.
It fails on console errors, page errors, failed requests, and HTTP 400 or higher; the after run passed 5 of 5.
The before run's only error was a 404 for the `favicon.ico` probe, a file this task adds.
The sign-in logo shows on Auth's page, so the settings captures show no icon; the unit and e2e tests cover its URL.

| View                         | Before                                           | After                                          |
| :--------------------------- | :----------------------------------------------- | :--------------------------------------------- |
| Tab, touch, manifest icons   | [before-icons.png](before-icons.png)             | [after-icons.png](after-icons.png)             |
| Sidebar brand, light         | [before-sidebar-light.png](before-sidebar-light.png) | [after-sidebar-light.png](after-sidebar-light.png) |
| Sidebar brand, dark          | [before-sidebar-dark.png](before-sidebar-dark.png) | [after-sidebar-dark.png](after-sidebar-dark.png) |
| Settings, light              | [before-settings-light.png](before-settings-light.png) | [after-settings-light.png](after-settings-light.png) |
| Settings, dark               | [before-settings-dark.png](before-settings-dark.png) | [after-settings-dark.png](after-settings-dark.png) |
| Compact, light               | [before-mobile-light.png](before-mobile-light.png) | [after-mobile-light.png](after-mobile-light.png) |
| Gallery sidebar              | [before-gallery-sidebar.png](before-gallery-sidebar.png) | [after-gallery-sidebar.png](after-gallery-sidebar.png) |
