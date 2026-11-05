## Walkthrough & Validation
`lists.js` fills `#/lists` with New list and one row per list: name, description start, and counts.
`list-editor.js` mounts in the editor panel on `#/lists/{{list-id}}/edit` and `#/lists/new`.
It saves the name and description on change; store validation errors show on the field.
A new list is created on its first valid name; the editor then stays on `#/lists/new`.
`confirmListDelete` holds the delete dialog; the List screen now reuses it.
A delete in the same tab no longer makes the List screen show its "not found" toast.
`app.js` registers both; the sidebar New list and Edit list already linked to the editor routes.
`shell.spec.js` now expects the filled Lists view instead of an empty one.
Commands ran in a clean work copy, not the shared working tree; e2e used port 8859.
The red phase ran on the 9060962 extract; `main` then gained a994e12, merged in before green.

### Red Phase
The new tests ran before `lists.js` and `list-editor.js` existed.

Command: `npx vitest run tests/unit/list-editor.test.js` (exit code 1)

```text

 RUN  v5.1.0 {{work-copy}}

 ❯ tests/unit/list-editor.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/list-editor.test.js [ tests/unit/list-editor.test.js ]
Error: Failed to resolve import "../../src/js/views/list-editor.js" from "tests/unit/list-editor.test.js". Does the file exist?
  Plugin: vite:import-analysis
[... 11 lines omitted ...]
 Test Files  1 failed (1)
      Tests  no tests
   Start at  21:49:19
   Duration  909ms (environment 99%, worker 1%)
```

Command: `E2E_PORT=8859 npx playwright test tests/e2e/lists.spec.js --timeout 10000` (exit code 1)

```text

Running 3 tests using 3 workers

  x  1 [chromium] › tests\e2e\lists.spec.js:67:1 › the overview shows each list with its description and counts, which follow task changes (LST-5) (7.7s)
  x  2 [chromium] › tests\e2e\lists.spec.js:120:1 › Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7) (8.1s)
  x  3 [chromium] › tests\e2e\lists.spec.js:85:1 › New list creates the list once a valid name is typed, and closing early creates nothing (LST-1, LST-3) (7.9s)

[... lines omitted ...]
    Error: expect(locator).toHaveText(expected) failed
    Locator: locator('.lists-view .list-row').locator('.list-row__name')
    Error: expect(locator).toHaveText(expected) failed
    Locator: locator('.lists-view .list-row__name')
    Error: expect(locator).toHaveValue(expected) failed
    Locator: locator('[data-editor-slot] .editor-panel').getByRole('textbox', { name: 'Name' })
[... lines omitted ...]
  3 failed
    [chromium] › tests\e2e\lists.spec.js:67:1 › the overview shows each list with its description and counts, which follow task changes (LST-5) 
    [chromium] › tests\e2e\lists.spec.js:85:1 › New list creates the list once a valid name is typed, and closing early creates nothing (LST-1, LST-3) 
    [chromium] › tests\e2e\lists.spec.js:120:1 › Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7) 
```

### Green Phase
Two e2e locators changed during green: the name error and the details line were ambiguous in strict mode.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 {{work-copy}}


 Test Files  29 passed (29)
      Tests  569 passed (569)
   Start at  21:59:06
   Duration  5.26s (environment 68%, tests 19%, import 9%, transform 2%, worker 2%)

    Isolate  29 workers spawned · ~853ms startup each (spawn + environment, per file)
             at least ~2.68s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npx eslint .` (exit code 0)

```text

```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 51 precached files match VERSION 2026-11-04.16.
```

Command: `E2E_PORT=8859 npx playwright test` (exit code 0)

```text

Running 106 tests using 4 workers

[... lines omitted ...]
  ok  83 [chromium] › tests\e2e\lists.spec.js:67:1 › the overview shows each list with its description and counts, which follow task changes (LST-5) (1.2s)
  ok  84 [chromium] › tests\e2e\lists.spec.js:85:1 › New list creates the list once a valid name is typed, and closing early creates nothing (LST-1, LST-3) (1.5s)
  ok  85 [chromium] › tests\e2e\lists.spec.js:121:1 › Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7) (1.5s)
  ok  93 [chromium] › tests\e2e\shell.spec.js:94:1 › every route renders its title and its view, and the sidebar follows the lists (1.5s)
[... lines omitted ...]

  106 passed (52.3s)
```

### Visual Check
A throwaway Playwright script with an in-process server seeded Home, Work, and Errands with five tasks.
It captured `#/lists` and `#/lists/{{list-id}}/edit` at 390 and 1440 px in both themes.
It reported HTTP 200 and no console errors; after shots add `#/lists/new` with a duplicate name.

| View       | Lists before                                      | Lists after                                     | Editor before                                           | Editor after                                          | New list, duplicate name                                        |
| :--------- | :------------------------------------------------ | :---------------------------------------------- | :------------------------------------------------------ | :---------------------------------------------------- | :-------------------------------------------------------------- |
| 390 light  | [before](screenshots/lists-390-light-before.png)  | [after](screenshots/lists-390-light-after.png)  | [before](screenshots/list-editor-390-light-before.png)  | [after](screenshots/list-editor-390-light-after.png)  | [after](screenshots/list-editor-390-light-new-error-after.png)  |
| 390 dark   | [before](screenshots/lists-390-dark-before.png)   | [after](screenshots/lists-390-dark-after.png)   | [before](screenshots/list-editor-390-dark-before.png)   | [after](screenshots/list-editor-390-dark-after.png)   | [after](screenshots/list-editor-390-dark-new-error-after.png)   |
| 1440 light | [before](screenshots/lists-1440-light-before.png) | [after](screenshots/lists-1440-light-after.png) | [before](screenshots/list-editor-1440-light-before.png) | [after](screenshots/list-editor-1440-light-after.png) | [after](screenshots/list-editor-1440-light-new-error-after.png) |
| 1440 dark  | [before](screenshots/lists-1440-dark-before.png)  | [after](screenshots/lists-1440-dark-after.png)  | [before](screenshots/list-editor-1440-dark-before.png)  | [after](screenshots/list-editor-1440-dark-after.png)  | [after](screenshots/list-editor-1440-dark-new-error-after.png)  |

- Before, `#/lists` showed an empty view and the editor route left the slot hidden.
- The first after shot of a new list kept the fields divider above the hidden sections; it now ends cleanly.
- Sharing state and owners stay out of the rows until sharing lands; ui-design.md records it.
