## Walkthrough & Validation

### Summary
- service-worker.js precaches the shell under a versioned cache, serves same-origin GETs cache first, and drops old caches.
- The manifest, the SVG icon, and its PNG renders make the app installable.
- index.html links the manifest and icons; app.js registers the worker.
- devops.md explains offline testing, precache upkeep, and icon rendering.

Each run used a scratch tree: `git archive HEAD` extracted, the stage files overlaid, and `node_modules` linked.
End-to-end runs set a free `E2E_PORT` per run.

### Red Phase
The PWA tests ran against stage 3 (with the shell), before the worker and manifest existed.

Command: `npx vitest run tests/unit/precache.test.js` (exit code 1)

```text
 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0034-red

 ❯ tests/unit/precache.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/precache.test.js [ tests/unit/precache.test.js ]
Error: ENOENT: no such file or directory, open 'C:\Users\giova\AppData\Local\Temp\claude\c--Dev-Projects-todos-webapp\2ef3bbc3-e820-4103-9d60-421b54f7c558\scratchpad\trees\T0034-red\src\service-worker.js'
 ❯ tests/unit/precache.test.js:7:16
      5|
      6| const ROOT = fileURLToPath(new URL('../../src/', import.meta.url));
      7| const SOURCE = readFileSync(join(ROOT, 'service-worker.js'), 'utf8');
       |                ^
      8|
      9| // Files under src/ that the app never loads: the gallery, the worker …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  17:16:34
   Duration  216ms (worker 97%, environment 3%)
```

Command: `npx playwright test tests/e2e/pwa.spec.js` (exit code 1)

```text
[... 3 lines omitted ...]
Running 2 tests using 2 workers
[... 9 lines omitted ...]
  x  1 [chromium] › tests\e2e\pwa.spec.js:35:1 › after one online visit the app reloads and navigates offline (30.1s)
  x  2 [chromium] › tests\e2e\pwa.spec.js:53:1 › the manifest is served with its type and makes the app installable (30.1s)
[... 6 lines omitted ...]
    Error: page.evaluate: Test timeout of 30000ms exceeded.
[... 10 lines omitted ...]
    Error Context: test-results\pwa-after-one-online-visit-a5d04-loads-and-navigates-offline-chromium\error-context.md
[... 13 lines omitted ...]
    Error: locator.getAttribute: Test timeout of 30000ms exceeded.
[... 13 lines omitted ...]
    Error Context: test-results\pwa-the-manifest-is-served-44419-d-makes-the-app-installable-chromium\error-context.md
[... 9 lines omitted ...]
  2 failed
    [chromium] › tests\e2e\pwa.spec.js:35:1 › after one online visit the app reloads and navigates offline
    [chromium] › tests\e2e\pwa.spec.js:53:1 › the manifest is served with its type and makes the app installable
```

### Green Phase
The completion check ran at this task's own stage.

Command: `npm test` (exit code 0)

```text
> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0034-green


 Test Files  18 passed (18)
      Tests  472 passed (472)
   Start at  17:17:09
   Duration  2.72s (environment 50%, tests 25%, import 19%, transform 4%, worker 2%)

    Isolate  18 workers spawned · ~536ms startup each (spawn + environment, per file)
             at least ~842ms faster with isolate: false — reuses workers across files instead of one per file
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
[... 4 lines omitted ...]
Running 69 tests using 4 workers
[... 84 lines omitted ...]
  ok 69 [chromium] › tests\e2e\shell.spec.js:173:1 › the theme follows the system by default and a stored preference pins it (718ms)
  ok 47 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (14.6s)
[... 1 lines omitted ...]
  69 passed (40.2s)
```

### Visual Check
No visual change to the shell; the 192 px icon render was inspected by eye.

### Review Rework
The agent review found that the install could store stale files from the browser's HTTP cache.
Install now fetches every precache entry with `cache: 'reload'`, and VERSION is bumped.

Command: `npx vitest run tests/unit/precache.test.js` (exit code 1, before the fix)

```text
     × installs from the network, bypassing the HTTP cache, so a new version never stores stale files 28ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
     82|       expect(request.cache).toBe('reload');
      Tests  1 failed | 3 passed (4)
```

After the fix: `npm test` passed 473 tests, `npm run lint` was clean, and `E2E_PORT=8803 npx playwright test` passed 69 tests.
