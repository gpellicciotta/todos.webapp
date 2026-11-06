# Validation proof

## Walkthrough & Validation
Command: `npx vitest run tests/unit/layout.test.js`. Exit code: 1.

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/layout.test.js (6 tests | 1 failed) 54ms
   ❯ renderShell navigation (5)
     × places an icon-only New list link beside the Lists group heading 24ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/layout.test.js > renderShell navigation > places an icon-only New list link beside the Lists group heading
AssertionError: expected undefined to be 'Lists' // Object.is equality

- Expected:
"Lists"

+ Received:
undefined

 ❯ tests/unit/layout.test.js:23:34
     21|     const { root, shell } = render();
     22|     const heading = root.querySelector('.sidebar__lists-header h2');
     23|     expect(heading?.textContent).toBe('Lists');
       |                                  ^
     24|     const link = heading.parentElement.querySelector('a');
     25|     expect(link.classList.contains('icon-button')).toBe(true);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
   Start at  15:15:04
   Duration  980ms (environment 84%, tests 7%, transform 6%, import 3%, worker 1%)
```

Command: `npm test`. Exit code: 0.

```text

> todos-webapp@0.1.1-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  37 passed (37)
      Tests  748 passed (748)
   Start at  15:16:03
   Duration  8.96s (environment 68%, tests 20%, import 8%, transform 2%, worker 2%)

    Isolate  37 workers spawned · ~1.17s startup each (spawn + environment, per file)
             at least ~5.02s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js`. Exit code: 0.

```text
[... 15 lines omitted ...]
(node:65932) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:67748) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:65208) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ok  4 [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the compact layout (2.3s)
  ok  1 [chromium] › tests\e2e\lists.spec.js:67:1 › the overview shows each list with its description and counts, which follow task changes (LST-5) (2.2s)
  ok  2 [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the wide layout (2.9s)
  ok  3 [chromium] › tests\e2e\lists.spec.js:117:1 › the floating New list button stays over the rows, and the last row scrolls clear of it (3.7s)
  ok  5 [chromium] › tests\e2e\lists.spec.js:148:1 › the floating New list button hides while the New list editor is open (2.0s)
  ok  6 [chromium] › tests\e2e\lists.spec.js:158:1 › New list creates the list once a valid name is typed, and closing early creates nothing (LST-1, LST-3) (2.2s)
  ok  7 [chromium] › tests\e2e\lists.spec.js:194:1 › Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7) (2.6s)
  ok  8 [chromium] › tests\e2e\shell.spec.js:6:1 › the sidebar Lists heading offers a keyboard-accessible plus link (1.2s)
  ok  9 [chromium] › tests\e2e\shell.spec.js:78:3 › the compact layout shows at 1023 px (1.1s)
  ok 10 [chromium] › tests\e2e\shell.spec.js:78:3 › the compact layout shows at 390 px (1.2s)
  ok 11 [chromium] › tests\e2e\shell.spec.js:78:3 › the wide layout shows at 1024 px (1.1s)
  ok 12 [chromium] › tests\e2e\shell.spec.js:78:3 › the wide layout shows at 1440 px (1.3s)
  ok 13 [chromium] › tests\e2e\shell.spec.js:101:1 › navigation marks the current route, and back and forward move between routes (1.3s)
  ok 14 [chromium] › tests\e2e\shell.spec.js:131:3 › the compact user button names Local User and opens Recycle bin and Settings (2.0s)
  ok 16 [chromium] › tests\e2e\shell.spec.js:164:1 › the bottom bar spreads its two destinations over the full width (1.2s)
  ok 15 [chromium] › tests\e2e\shell.spec.js:131:3 › the wide user button names Local User and opens Recycle bin and Settings (1.5s)
  ok 17 [chromium] › tests\e2e\shell.spec.js:179:3 › the narrow panel stays aligned with the button for a long name (1.2s)
  ok 20 [chromium] › tests\e2e\shell.spec.js:216:1 › an expired session shows a Sign in button that opens the connect screen (1.3s)
  ok 18 [chromium] › tests\e2e\shell.spec.js:179:3 › the desktop panel stays aligned with the button for a long name (1.7s)
  ok 19 [chromium] › tests\e2e\shell.spec.js:198:1 › a connected account shows its initials and name, and Connected in the panel (1.7s)
  ok 21 [chromium] › tests\e2e\shell.spec.js:232:1 › every route renders its title and its view, and the sidebar follows the lists (2.1s)
  ok 22 [chromium] › tests\e2e\shell.spec.js:281:1 › an unknown route or list opens All tasks with a toast naming it (989ms)
  ok 23 [chromium] › tests\e2e\shell.spec.js:296:1 › the n and / shortcuts focus the add bar and search once a view has them (1.1s)
  ok 24 [chromium] › tests\e2e\shell.spec.js:317:1 › Escape closes an open editor route (1.2s)
  ok 26 [chromium] › tests\e2e\shell.spec.js:340:1 › a newer app version in another tab shows a lasting banner with Reload (796ms)
  ok 27 [chromium] › tests\e2e\shell.spec.js:364:1 › a start-up failure shows an error banner instead of a broken page (958ms)
  ok 25 [chromium] › tests\e2e\shell.spec.js:324:1 › the theme follows the system by default and a stored preference pins it (1.4s)

  27 passed (15.2s)
```

Command: `npm run lint`. Exit code: 0.

```text

> todos-webapp@0.1.1-pre lint
> eslint .
```

## Visual verification
All captures received HTTP 200 and recorded no console errors, exceptions, failed requests, or HTTP errors.
No horizontal overflow occurred at either viewport.
The desktop header uses the existing muted icon button; the compact view keeps its floating action button.

- [before-app-390-light.png](before-app-390-light.png)
- [before-app-390-dark.png](before-app-390-dark.png)
- [before-app-1440-light.png](before-app-1440-light.png)
- [before-app-1440-dark.png](before-app-1440-dark.png)
- [before-gallery-390-light.png](before-gallery-390-light.png)
- [before-gallery-390-dark.png](before-gallery-390-dark.png)
- [before-gallery-1440-light.png](before-gallery-1440-light.png)
- [before-gallery-1440-dark.png](before-gallery-1440-dark.png)
- [after-app-390-light.png](after-app-390-light.png)
- [after-app-390-dark.png](after-app-390-dark.png)
- [after-app-1440-light.png](after-app-1440-light.png)
- [after-app-1440-dark.png](after-app-1440-dark.png)
- [after-gallery-390-light.png](after-gallery-390-light.png)
- [after-gallery-390-dark.png](after-gallery-390-dark.png)
- [after-gallery-1440-light.png](after-gallery-1440-light.png)
- [after-gallery-1440-dark.png](after-gallery-1440-dark.png)

## Review correction
Removed the duplicate heading and paired the plus with the existing Lists icon and navigation link.
Repository-wide ESLint encountered EPERM while scanning `.pytest_cache`; targeted lint passed for every changed JavaScript file.

Command: `npx vitest run tests/unit/layout.test.js`. Exit code: 1.

```text
[... 3 lines omitted ...]
 ❯ tests/unit/layout.test.js (6 tests | 1 failed) 66ms
   ❯ renderShell navigation (5)
     × places an icon-only New list link beside the existing Lists navigation link 29ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/layout.test.js > renderShell navigation > places an icon-only New list link beside the existing Lists navigation link
AssertionError: expected undefined to be 'Lists' // Object.is equality

- Expected:
"Lists"

+ Received:
undefined

 ❯ tests/unit/layout.test.js:23:34
     21|     const { root, shell } = render();
     22|     const heading = root.querySelector('.sidebar__lists-header [data-n…
     23|     expect(heading?.textContent).toBe('Lists');
       |                                  ^
     24|     expect(root.querySelectorAll('.app__sidebar .nav-item__label')).to…
     25|     expect(root.querySelector('.app__sidebar h2')).toBeNull();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
   Start at  17:46:49
   Duration  1.25s (environment 85%, tests 6%, transform 5%, import 2%, worker 1%)
```

Command: `npm test`. Exit code: 0.

```text

> todos-webapp@0.1.1-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  37 passed (37)
      Tests  748 passed (748)
   Start at  17:47:16
   Duration  12.74s (environment 70%, tests 19%, import 7%, transform 2%, worker 2%)

    Isolate  37 workers spawned · ~1.69s startup each (spawn + environment, per file)
             at least ~7.24s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npx eslint src/js/ui/layout.js tests/unit/layout.test.js tests/e2e/shell.spec.js`. Exit code: 0.

```text

```

Revised app and gallery captures passed HTTP, browser error, and overflow checks in both themes at both widths.
- [revised-app-390-light.png](revised-app-390-light.png)
- [revised-app-390-dark.png](revised-app-390-dark.png)
- [revised-app-1440-light.png](revised-app-1440-light.png)
- [revised-app-1440-dark.png](revised-app-1440-dark.png)
- [revised-gallery-390-light.png](revised-gallery-390-light.png)
- [revised-gallery-390-dark.png](revised-gallery-390-dark.png)
- [revised-gallery-1440-light.png](revised-gallery-1440-light.png)
- [revised-gallery-1440-dark.png](revised-gallery-1440-dark.png)

Command: `npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js`. Exit code: 0.

```text
[... 20 lines omitted ...]
(Use `node --trace-warnings ...` to show where the warning was created)
  ok  2 [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the wide layout (1.8s)
  ok  4 [chromium] › tests\e2e\lists.spec.js:67:1 › the overview shows each list with its description and counts, which follow task changes (LST-5) (2.2s)
  ok  3 [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the compact layout (2.7s)
  ok  1 [chromium] › tests\e2e\lists.spec.js:117:1 › the floating New list button stays over the rows, and the last row scrolls clear of it (2.9s)
  ok  5 [chromium] › tests\e2e\lists.spec.js:148:1 › the floating New list button hides while the New list editor is open (1.2s)
  ok  6 [chromium] › tests\e2e\lists.spec.js:158:1 › New list creates the list once a valid name is typed, and closing early creates nothing (LST-1, LST-3) (1.9s)
  ok  7 [chromium] › tests\e2e\lists.spec.js:194:1 › Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7) (1.9s)
  ok  9 [chromium] › tests\e2e\shell.spec.js:80:3 › the compact layout shows at 390 px (1.8s)
  ok  8 [chromium] › tests\e2e\shell.spec.js:6:1 › the sidebar Lists heading offers a keyboard-accessible plus link (2.5s)
  ok 12 [chromium] › tests\e2e\shell.spec.js:80:3 › the wide layout shows at 1440 px (921ms)
  ok 11 [chromium] › tests\e2e\shell.spec.js:80:3 › the wide layout shows at 1024 px (1.3s)
  ok 10 [chromium] › tests\e2e\shell.spec.js:80:3 › the compact layout shows at 1023 px (1.5s)
  ok 14 [chromium] › tests\e2e\shell.spec.js:133:3 › the compact user button names Local User and opens Recycle bin and Settings (1.2s)
  ok 13 [chromium] › tests\e2e\shell.spec.js:103:1 › navigation marks the current route, and back and forward move between routes (1.5s)
  ok 16 [chromium] › tests\e2e\shell.spec.js:166:1 › the bottom bar spreads its two destinations over the full width (1.0s)
  ok 17 [chromium] › tests\e2e\shell.spec.js:181:3 › the narrow panel stays aligned with the button for a long name (821ms)
  ok 18 [chromium] › tests\e2e\shell.spec.js:181:3 › the desktop panel stays aligned with the button for a long name (898ms)
  ok 15 [chromium] › tests\e2e\shell.spec.js:133:3 › the wide user button names Local User and opens Recycle bin and Settings (2.0s)
  ok 19 [chromium] › tests\e2e\shell.spec.js:200:1 › a connected account shows its initials and name, and Connected in the panel (1.2s)
  ok 20 [chromium] › tests\e2e\shell.spec.js:218:1 › an expired session shows a Sign in button that opens the connect screen (1.4s)
  ok 22 [chromium] › tests\e2e\shell.spec.js:283:1 › an unknown route or list opens All tasks with a toast naming it (1.3s)
  ok 23 [chromium] › tests\e2e\shell.spec.js:298:1 › the n and / shortcuts focus the add bar and search once a view has them (1.3s)
  ok 24 [chromium] › tests\e2e\shell.spec.js:319:1 › Escape closes an open editor route (1.3s)
  ok 21 [chromium] › tests\e2e\shell.spec.js:234:1 › every route renders its title and its view, and the sidebar follows the lists (3.5s)
  ok 27 [chromium] › tests\e2e\shell.spec.js:366:1 › a start-up failure shows an error banner instead of a broken page (1.0s)
  ok 25 [chromium] › tests\e2e\shell.spec.js:326:1 › the theme follows the system by default and a stored preference pins it (2.2s)
  ok 26 [chromium] › tests\e2e\shell.spec.js:342:1 › a newer app version in another tab shows a lasting banner with Reload (1.9s)

  27 passed (14.3s)
```

## Sidebar action removal
Removed sidebar list creation. The main Lists view floating plus remains available.

Command: `npx vitest run tests/unit/layout.test.js`. Exit code: 1.

```text
[... 41 lines omitted ...]

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/unit/layout.test.js > renderShell navigation > keeps Recycle bin and Settings out of the sidebar and the bottom bar
AssertionError: expected [ '#/tasks', '#/lists', '#/lists/new' ] to deeply equal [ '#/tasks', '#/lists' ]

- Expected
+ Received

  [
    "#/tasks",
    "#/lists",
+   "#/lists/new",
  ]

 ❯ tests/unit/layout.test.js:45:21
     43|     const sidebar = [...root.querySelectorAll('.app__sidebar a')].map(…
     44|     const bottom = [...root.querySelectorAll('.app__bottom-nav a')].ma…
     45|     expect(sidebar).toEqual(['#/tasks', '#/lists']);
       |                     ^
     46|     expect(bottom).toEqual(['#/tasks', '#/lists']);
     47|     expect([...root.querySelectorAll('.user-panel a')].map((link) => l…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 4 passed (6)
   Start at  18:40:44
   Duration  1.21s (environment 86%, tests 6%, transform 5%, import 3%, worker 1%)
```

Command: `npm test`. Exit code: 0.

```text

> todos-webapp@0.1.1-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  37 passed (37)
      Tests  748 passed (748)
   Start at  18:41:09
   Duration  10.96s (environment 71%, tests 19%, import 7%, transform 2%, worker 2%)

    Isolate  37 workers spawned · ~1.46s startup each (spawn + environment, per file)
             at least ~6.26s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js`. Exit code: 0.

```text
[... 20 lines omitted ...]
(Use `node --trace-warnings ...` to show where the warning was created)
  ok  4 [chromium] › tests\e2e\lists.spec.js:67:1 › the overview shows each list with its description and counts, which follow task changes (LST-5) (2.0s)
  ok  2 [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the compact layout (2.4s)
  ok  3 [chromium] › tests\e2e\lists.spec.js:117:1 › the floating New list button stays over the rows, and the last row scrolls clear of it (2.4s)
  ok  5 [chromium] › tests\e2e\lists.spec.js:148:1 › the floating New list button hides while the New list editor is open (1.3s)
  ok  1 [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the wide layout (3.3s)
  ok  6 [chromium] › tests\e2e\lists.spec.js:158:1 › New list creates the list once a valid name is typed, and closing early creates nothing (LST-1, LST-3) (2.0s)
  ok  7 [chromium] › tests\e2e\lists.spec.js:194:1 › Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7) (1.9s)
  ok  8 [chromium] › tests\e2e\shell.spec.js:6:1 › list creation stays in the main Lists view (853ms)
  ok 10 [chromium] › tests\e2e\shell.spec.js:70:3 › the compact layout shows at 1023 px (1.1s)
  ok  9 [chromium] › tests\e2e\shell.spec.js:70:3 › the compact layout shows at 390 px (1.2s)
  ok 11 [chromium] › tests\e2e\shell.spec.js:70:3 › the wide layout shows at 1024 px (1.2s)
  ok 12 [chromium] › tests\e2e\shell.spec.js:70:3 › the wide layout shows at 1440 px (1.2s)
  ok 13 [chromium] › tests\e2e\shell.spec.js:93:1 › navigation marks the current route, and back and forward move between routes (1.2s)
  ok 15 [chromium] › tests\e2e\shell.spec.js:123:3 › the wide user button names Local User and opens Recycle bin and Settings (1.9s)
  ok 14 [chromium] › tests\e2e\shell.spec.js:123:3 › the compact user button names Local User and opens Recycle bin and Settings (2.0s)
  ok 16 [chromium] › tests\e2e\shell.spec.js:156:1 › the bottom bar spreads its two destinations over the full width (1.4s)
  ok 17 [chromium] › tests\e2e\shell.spec.js:171:3 › the narrow panel stays aligned with the button for a long name (1.4s)
  ok 18 [chromium] › tests\e2e\shell.spec.js:171:3 › the desktop panel stays aligned with the button for a long name (1.4s)
  ok 19 [chromium] › tests\e2e\shell.spec.js:190:1 › a connected account shows its initials and name, and Connected in the panel (1.9s)
  ok 20 [chromium] › tests\e2e\shell.spec.js:208:1 › an expired session shows a Sign in button that opens the connect screen (2.5s)
  ok 21 [chromium] › tests\e2e\shell.spec.js:224:1 › every route renders its title and its view, and the sidebar follows the lists (2.9s)
  ok 22 [chromium] › tests\e2e\shell.spec.js:273:1 › an unknown route or list opens All tasks with a toast naming it (2.0s)
  ok 23 [chromium] › tests\e2e\shell.spec.js:288:1 › the n and / shortcuts focus the add bar and search once a view has them (1.8s)
  ok 24 [chromium] › tests\e2e\shell.spec.js:309:1 › Escape closes an open editor route (1.6s)
  ok 26 [chromium] › tests\e2e\shell.spec.js:332:1 › a newer app version in another tab shows a lasting banner with Reload (1.1s)
  ok 25 [chromium] › tests\e2e\shell.spec.js:316:1 › the theme follows the system by default and a stored preference pins it (1.6s)
  ok 27 [chromium] › tests\e2e\shell.spec.js:356:1 › a start-up failure shows an error banner instead of a broken page (1.4s)

  27 passed (16.3s)
```

App and gallery captures passed HTTP, browser error, and overflow checks at both widths in both themes.
- [removed-app-390-light.png](removed-app-390-light.png)
- [removed-app-390-dark.png](removed-app-390-dark.png)
- [removed-app-1440-light.png](removed-app-1440-light.png)
- [removed-app-1440-dark.png](removed-app-1440-dark.png)
- [removed-gallery-390-light.png](removed-gallery-390-light.png)
- [removed-gallery-390-dark.png](removed-gallery-390-dark.png)
- [removed-gallery-1440-light.png](removed-gallery-1440-light.png)
- [removed-gallery-1440-dark.png](removed-gallery-1440-dark.png)

## Integration checks
Command: `npm run check:sw`. Exit code: 0.

```text
OK: 55 precached files match VERSION 2026-11-06.13.
```

Command: `npx vitest run tests/unit/service-worker.test.js tests/unit/check-sw-version.test.js`. Exit code: 0.

```text
 Test Files  2 passed (2)
      Tests  30 passed (30)
```
