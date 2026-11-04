## Walkthrough & Validation
`view-controls.js` builds search, the Lists, Status, Due, and Created chips with popovers, Clear all, and the Sort menu.
Compact layouts group the filters behind one Filters button with the active filter count.
Filters and sort round-trip through `core/preferences.js` under `todos.view.{{view}}`; the search text stays out.
Preferences fall back to defaults when storage is empty, malformed, or throws.
No screen uses the module yet; T0016 mounts it. The precache list and VERSION 2026-11-04.5 include both files.
The code was written during T0016 and split out on 2026-11-04; this is stage 3 of the split.

### Red Phase
The new unit tests ran against stage 2, where the modules do not exist. Each run used a fresh tree: `git archive HEAD` extracted, the stage files copied over, and a `node_modules` junction.

Command: `npx vitest run tests/unit/view-controls.test.js` (exit code 1)

```text
[... 7 lines omitted ...]
 FAIL  tests/unit/view-controls.test.js [ tests/unit/view-controls.test.js ]
Error: Failed to resolve import "../../src/js/views/view-controls.js" from "tests/unit/view-controls.test.js". Does the file exist?
[... 19 lines omitted ...]
 Test Files  1 failed (1)
      Tests  no tests
[... 2 lines omitted ...]
```

### Green Phase
Stage 3 is stage 2 plus this task's files, with regenerated hashes. Each run used a fresh tree: `git archive HEAD` extracted, the stage files copied over, and a `node_modules` junction.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


[... 1 lines omitted ...]


 Test Files  22 passed (22)
      Tests  516 passed (516)
   Start at  18:42:07
   Duration  3.91s (environment 58%, tests 20%, import 12%, transform 8%, worker 2%)

    Isolate  22 workers spawned · ~717ms startup each (spawn + environment, per file)
             at least ~1.54s faster with isolate: false — reuses workers across files instead of one per file
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `npm run check:sw` (exit code 0)

```text

> todos-webapp@0.1.0-pre check:sw
> node scripts/check-sw-version.mjs

OK: 38 precached files match VERSION 2026-11-04.5.
```

Command: `E2E_PORT=8823 npm run test:e2e` (exit code 0)

```text
[... 81 lines omitted ...]
  73 passed (38.7s)
```

