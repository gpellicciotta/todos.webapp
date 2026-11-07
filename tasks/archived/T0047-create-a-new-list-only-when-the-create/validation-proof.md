# Validation proof

## Walkthrough & Validation
Command: `npx vitest run tests/unit/list-editor.test.js`. Exit code: 1.

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/list-editor.test.js (13 tests | 4 failed) 408ms
   ❯ mountListEditor (13)
     × creates a valid draft only through Create, including its description (LST-1) 12ms
     × discards a typed valid name when the new editor closes 10ms
     × creates on Enter in the name field, but not on ordinary draft changes 5ms
     × rejects a recycled duplicate and an overlong description without creating a draft 6ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/list-editor.test.js > mountListEditor > creates a valid draft only through Create, including its description (LST-1)
AssertionError: expected undefined to be defined
 ❯ tests/unit/list-editor.test.js:118:20
    116|     expect(panel.body.querySelector('.editor-panel__danger').hidden).t…
    117|     const create = [...panel.body.querySelectorAll('button')].find((bu…
    118|     expect(create).toBeDefined();
       |                    ^
    119|     expect(create.disabled).toBe(true);
    120|     change(description, 'Flowers and vegetables');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  tests/unit/list-editor.test.js > mountListEditor > discards a typed valid name when the new editor closes
AssertionError: expected [ { …(7) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "creation-time": "2026-11-04T09:00:00.000Z",
+     "deletion-time": null,
```

```text
+     "description": "",
+     "id": "01a1a5c9-5e80-705b-8b13-90861c1a581b",
+     "last-update-time": "2026-11-04T09:00:00.000Z",
+     "name": "Garden",
+     "owner": null,
+   },
+ ]

 ❯ tests/unit/list-editor.test.js:165:37
    163|     closing.destroy();
    164|     await closing.idle();
    165|     expect(await store.listLists()).toEqual([]);
       |                                     ^
    166|   });
    167|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  tests/unit/list-editor.test.js > mountListEditor > creates on Enter in the name field, but not on ordinary draft changes
AssertionError: expected [ { …(7) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "creation-time": "2026-11-04T09:00:00.000Z",
+     "deletion-time": null,
+     "description": "",
+     "id": "01a1a5c9-5e80-705c-8717-a4aa69fe2696",
+     "last-update-time": "2026-11-04T09:00:00.000Z",
+     "name": "Garden",
+     "owner": null,
+   },
```

```text
+ ]

 ❯ tests/unit/list-editor.test.js:172:37
    170|     change(name, 'Garden');
    171|     await editor.idle();
    172|     expect(await store.listLists()).toEqual([]);
       |                                     ^
    173|     name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bu…
    174|     await editor.idle();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  tests/unit/list-editor.test.js > mountListEditor > rejects a recycled duplicate and an overlong description without creating a draft
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/unit/list-editor.test.js:189:57
    187|     await editor.idle();
    188|     expect(errorOf(description)).toMatch(/1000/);
    189|     expect(panel.body.querySelector('button').disabled).toBe(true);
       |                                                         ^
    190|     expect(await store.listLists()).toEqual([]);
    191|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  1 failed (1)
      Tests  4 failed | 9 passed (13)
   Start at  20:33:01
```

```text
   Duration  2.19s (environment 63%, tests 21%, import 9%, transform 7%)
```

Command: `npx vitest run tests/unit/list-editor.test.js -t 'locks draft fields'`. Exit code: 1.

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/list-editor.test.js (14 tests | 1 failed | 13 skipped) 94ms
   ❯ mountListEditor (14)
     × locks draft fields during submission and unlocks them once created 92ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/list-editor.test.js > mountListEditor > locks draft fields during submission and unlocks them once created
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/unit/list-editor.test.js:192:27
    190|     });
    191|     panel.body.querySelector('button').click();
    192|     expect(name.disabled).toBe(true);
       |                           ^
    193|     expect(description.disabled).toBe(true);
    194|     release();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 13 skipped (14)
   Start at  20:37:07
   Duration  1.68s (environment 79%, import 7%, transform 7%, tests 6%, worker 1%)
```

Command: `npm test`. Exit code: 0.

```text

> todos-webapp@0.1.3-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  37 passed (37)
      Tests  751 passed (751)
   Start at  20:37:33
   Duration  12.50s (environment 69%, tests 20%, import 8%, worker 2%, transform 2%)

    Isolate  37 workers spawned · ~1.69s startup each (spawn + environment, per file)
             at least ~7.23s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npx playwright test tests/e2e/lists.spec.js tests/e2e/shell.spec.js`. Exit code: 0.

```text
[... 16 lines omitted ...]
(Use `node --trace-warnings ...` to show where the warning was created)
(node:66228) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:63812) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ok  2 [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the compact layout (1.8s)
  ok  3 [chromium] › tests\e2e\lists.spec.js:117:1 › the floating New list button stays over the rows, and the last row scrolls clear of it (2.3s)
  ok  4 [chromium] › tests\e2e\lists.spec.js:86:3 › New list floats at the bottom right of the screen on the wide layout (2.3s)
  ok  1 [chromium] › tests\e2e\lists.spec.js:67:1 › the overview shows each list with its description and counts, which follow task changes (LST-5) (1.8s)
  ok  5 [chromium] › tests\e2e\lists.spec.js:148:1 › the floating New list button hides while the New list editor is open (1.4s)
  ok  7 [chromium] › tests\e2e\lists.spec.js:212:1 › Enter in the new list name creates the draft (1.9s)
  ok  8 [chromium] › tests\e2e\lists.spec.js:224:1 › Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7) (2.1s)
  ok  6 [chromium] › tests\e2e\lists.spec.js:158:1 › New list creates only through Create and discards drafts on close (LST-1, LST-3) (3.5s)
  ok  9 [chromium] › tests\e2e\shell.spec.js:6:1 › list creation stays in the main Lists view (1.7s)
  ok 11 [chromium] › tests\e2e\shell.spec.js:70:3 › the compact layout shows at 1023 px (2.0s)
  ok 10 [chromium] › tests\e2e\shell.spec.js:70:3 › the compact layout shows at 390 px (2.2s)
  ok 12 [chromium] › tests\e2e\shell.spec.js:70:3 › the wide layout shows at 1440 px (1.4s)
  ok 13 [chromium] › tests\e2e\shell.spec.js:70:3 › the wide layout shows at 1024 px (1.4s)
  ok 14 [chromium] › tests\e2e\shell.spec.js:93:1 › navigation marks the current route, and back and forward move between routes (2.0s)
  ok 15 [chromium] › tests\e2e\shell.spec.js:123:3 › the compact user button names Local User and opens Recycle bin and Settings (2.5s)
  ok 16 [chromium] › tests\e2e\shell.spec.js:123:3 › the wide user button names Local User and opens Recycle bin and Settings (2.0s)
  ok 17 [chromium] › tests\e2e\shell.spec.js:156:1 › the bottom bar spreads its two destinations over the full width (1.8s)
  ok 20 [chromium] › tests\e2e\shell.spec.js:190:1 › a connected account shows its initials and name, and Connected in the panel (1.1s)
  ok 21 [chromium] › tests\e2e\shell.spec.js:208:1 › an expired session shows a Sign in button that opens the connect screen (1.6s)
  ok 19 [chromium] › tests\e2e\shell.spec.js:171:3 › the desktop panel stays aligned with the button for a long name (1.9s)
  ok 18 [chromium] › tests\e2e\shell.spec.js:171:3 › the narrow panel stays aligned with the button for a long name (2.6s)
  ok 23 [chromium] › tests\e2e\shell.spec.js:273:1 › an unknown route or list opens All tasks with a toast naming it (880ms)
  ok 22 [chromium] › tests\e2e\shell.spec.js:224:1 › every route renders its title and its view, and the sidebar follows the lists (1.9s)
  ok 24 [chromium] › tests\e2e\shell.spec.js:288:1 › the n and / shortcuts focus the add bar and search once a view has them (1.4s)
  ok 25 [chromium] › tests\e2e\shell.spec.js:309:1 › Escape closes an open editor route (1.5s)
  ok 26 [chromium] › tests\e2e\shell.spec.js:316:1 › the theme follows the system by default and a stored preference pins it (1.6s)
  ok 27 [chromium] › tests\e2e\shell.spec.js:332:1 › a newer app version in another tab shows a lasting banner with Reload (1.2s)
  ok 28 [chromium] › tests\e2e\shell.spec.js:356:1 › a start-up failure shows an error banner instead of a broken page (1.5s)

  28 passed (17.2s)
```

Command: `npx eslint src/js/views/list-editor.js src/js/store/lists.js src/js/store/db.js src/js/version.js src/service-worker.js tests/unit/list-editor.test.js tests/e2e/lists.spec.js`. Exit code: 0.

```text

```

Command: `npm run check:sw`. Exit code: 0.

```text

> todos-webapp@0.1.3-pre check:sw
> node scripts/check-sw-version.mjs

OK: 55 precached files match VERSION 2026-11-06.15.
```

Command: `npx vitest run tests/unit/service-worker.test.js tests/unit/check-sw-version.test.js`. Exit code: 0.

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  2 passed (2)
      Tests  30 passed (30)
   Start at  20:38:23
   Duration  592ms (tests 71%, import 17%, worker 6%, transform 5%)
```

Command: `node .plan/tasks/T0047-create-a-new-list-only-when-the-create/capture.mjs after`. Exit code: 0.

```text
after: captured new-list editor at 390/1440 px in light/dark themes.
[]
```

## Visual verification
The local server returned HTTP 200 before captures. Both themes passed browser-error, request, and overflow checks at both widths.
The existing button component provides disabled, hover, focus, and active states without new styling.

- [before-390-light.png](before-390-light.png)
- [before-390-dark.png](before-390-dark.png)
- [before-1440-light.png](before-1440-light.png)
- [before-1440-dark.png](before-1440-dark.png)
- [after-390-light.png](after-390-light.png)
- [after-390-dark.png](after-390-dark.png)
- [after-1440-light.png](after-1440-light.png)
- [after-1440-dark.png](after-1440-dark.png)

## Independent review
The reviewer identified blur disabling Create and editable fields during a pending write.
Both issues were fixed with regression coverage; the reviewer approved the final revision.
The reviewer independently ran 14 focused editor tests successfully.
