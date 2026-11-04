## Walkthrough & Validation

### Red Phase
The tests ran before tokens.css, fonts.css, style.css, and the gallery existed.
Output blocks drop ANSI codes and trailing spaces only.

Command: `npx vitest run tests/unit/tokens.test.js` (exit code 1)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/tokens.test.js (70 tests | 67 failed) 77ms
   ❯ tokens.css (66)
     × exists in src/css 12ms
     ❯ light theme (32)
       × --color-text on --color-bg reaches 4.5:1 4ms
       × --color-text on --color-surface reaches 4.5:1 2ms
       × --color-text on --color-surface-sunken reaches 4.5:1 1ms
       × --color-text on --color-hover-bg reaches 4.5:1 1ms
       × --color-text on --color-selected-bg reaches 4.5:1 3ms
       × --color-text-muted on --color-bg reaches 4.5:1 2ms
       × --color-text-muted on --color-surface reaches 4.5:1 1ms
       × --color-text-muted on --color-surface-sunken reaches 4.5:1 1ms
       × --color-text-muted on --color-hover-bg reaches 4.5:1 1ms
       × --color-text-muted on --color-selected-bg reaches 4.5:1 1ms
       × --color-signal on --color-bg reaches 4.5:1 1ms
       × --color-signal on --color-surface reaches 4.5:1 1ms
       × --color-signal on --color-surface-sunken reaches 4.5:1 1ms
[... 202 lines omitted ...]

 ❯ tests/unit/tokens.test.js:272:19
    270|   it('include style.css, fonts.css, and the gallery stylesheet', () =>…
    271|     const names = sheets().map((path) => basename(path));
    272|     expect(names).toEqual(expect.arrayContaining(['style.css', 'fonts.…
       |                   ^
    273|   });
    274|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/67]⎯


 Test Files  1 failed (1)
      Tests  67 failed | 3 passed (70)
   Start at  02:23:36
   Duration  672ms (tests 49%, transform 27%, import 19%, worker 5%)
```

Command: `npx playwright test tests/e2e/gallery.spec.js` (exit code 1)

```text

Running 5 tests using 4 workers

  x  1 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the light theme (678ms)
  x  2 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the light theme (714ms)
  x  3 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the dark theme (569ms)
  x  4 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the dark theme (482ms)
  x  5 [chromium] › tests\e2e\gallery.spec.js:106:1 › gallery follows the system theme when System is selected (30.1s)


  1) [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the light theme

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 404

      66 |
      67 |       const response = await page.goto(GALLERY);
    > 68 |       expect(response.status()).toBe(200);
         |                                 ^
      69 |       await page.getByRole('radio', { name: theme.label }).check();
      70 |       await expect(page.locator('html')).toHaveAttribute('data-theme', theme.name);
      71 |
        at C:\Dev-Projects\todos.webapp\tests\e2e\gallery.spec.js:68:33

[... 115 lines omitted ...]

  5 failed
    [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the light theme
    [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the dark theme
    [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the light theme
    [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the dark theme
    [chromium] › tests\e2e\gallery.spec.js:106:1 › gallery follows the system theme when System is selected
```

After the red run, the fallback test switched to comparing raw values.
That lets the alpha shadow tints resolve; the contrast assertions did not change.

### Green Phase
The full unit run fails only in another task's files: `store-tasks.test.js` and `query.test.js`.
Those belong to the concurrent data store work, which is mid-change; tokens.test.js passes.

Command: `npm test` (exit code 1)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp

 ❯ tests/unit/query.test.js (0 test)
 ❯ tests/unit/store-tasks.test.js (39 tests | 15 failed) 120ms
   ❯ manual order (14)
     × appends created and added tasks after the last task of the list 12ms
     × appends after the last task by position, not by added time 3ms
     × moves a task before or after a neighbor 3ms
     × changes only the moved membership and leaves other lists unchanged 2ms
     × updates the last activity time of the moved task, not its last update time 2ms
     × rejects both neighbors 2ms
     × rejects no neighbor 3ms
     × rejects the task itself as neighbor 2ms
     × rejects a neighbor outside the list 2ms
     × rejects a neighbor that is a member of another list only 2ms
     × fails when the task is not in the list 2ms
     × rebalances the list when the new position would exceed 128 characters 3ms
     × rebalances the list when the neighbors share a position 2ms
     × keeps keys at most 128 characters over 800 moves to the same spot 2ms
   ❯ schema upgrade to version 3 (1)
     × assigns positions to existing memberships in added-time order 1ms

[... 167 lines omitted ...]


 Test Files  2 failed | 6 passed (8)
      Tests  15 failed | 201 passed (216)
   Start at  02:30:09
   Duration  810ms (import 46%, tests 38%, transform 10%, worker 6%)
```

Command: `npx vitest run tests/unit/tokens.test.js tests/unit/serve.test.js tests/unit/uuid7.test.js` (exit code 0)

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  3 passed (3)
      Tests  97 passed (97)
   Start at  02:30:27
   Duration  443ms (tests 50%, import 30%, transform 11%, worker 9%)
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run test:e2e` (exit code 0)

```text

> todos-webapp@0.1.0-pre test:e2e
> playwright test


Running 7 tests using 4 workers

  ok 2 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the dark theme (1.4s)
  ok 1 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 1440 px in the light theme (1.4s)
  ok 3 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the dark theme (1.4s)
  ok 4 [chromium] › tests\e2e\gallery.spec.js:62:5 › gallery renders cleanly at 390 px in the light theme (1.4s)
  ok 6 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 390 px (377ms)
  ok 7 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 1440 px (360ms)
  ok 5 [chromium] › tests\e2e\gallery.spec.js:106:1 › gallery follows the system theme when System is selected (759ms)

  7 passed (4.4s)
```

Command: `python ../dev-guidelines/scripts/lint-markdown.py check docs` (exit code 0)

```text
Starting lint-markdown v1.12.9-pre+5f5408e with configuration:
- Command: check
- Log file: none
- Log level: INFO
- Verbose: false
- Working directory: C:\Dev-Projects\todos.webapp
All 6 markdown files passed linting.
Finished lint-markdown check in 0.1s with status: succeeded
```

### Visual Check
The before captures show the truthful 404, as the gallery did not exist yet.
The after captures show every token group, with HTTP 200, no console errors, and no horizontal scrolling.

| Width   | Theme | Before                                                                     | After                                                                    |
| :------ | :---- | :------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| 390 px  | light | [gallery-390-light-before.png](screenshots/gallery-390-light-before.png)   | [gallery-390-light-after.png](screenshots/gallery-390-light-after.png)   |
| 390 px  | dark  | [gallery-390-dark-before.png](screenshots/gallery-390-dark-before.png)     | [gallery-390-dark-after.png](screenshots/gallery-390-dark-after.png)     |
| 1440 px | light | [gallery-1440-light-before.png](screenshots/gallery-1440-light-before.png) | [gallery-1440-light-after.png](screenshots/gallery-1440-light-after.png) |
| 1440 px | dark  | [gallery-1440-dark-before.png](screenshots/gallery-1440-dark-before.png)   | [gallery-1440-dark-after.png](screenshots/gallery-1440-dark-after.png)   |
