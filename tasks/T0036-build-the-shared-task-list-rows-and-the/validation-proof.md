## Walkthrough & Validation
`task-list.js` renders task rows with the status, due, list, and note chips, and serves one status menu and one More menu.
The status menu sets a status by mouse or keyboard; Delete moves a task to the recycle bin with an Undo toast.
`add-bar.js` adds a task on Enter, keeps focus, shows a counter from 450 characters, and stops at 500.
No screen uses the modules yet; T0016 mounts them. The precache list and VERSION 2026-11-04.4 include them.
The code was written during T0016 and split out on 2026-11-04; this is stage 2 of the split.

### Red Phase
The new unit tests ran against stage 1, where the modules do not exist. Each run used a fresh tree: `git archive HEAD` extracted, the stage files copied over, and a `node_modules` junction.

Command: `npx vitest run tests/unit/task-list.test.js tests/unit/add-bar.test.js` (exit code 1)

```text
[... 8 lines omitted ...]
 FAIL  tests/unit/add-bar.test.js [ tests/unit/add-bar.test.js ]
Error: Failed to resolve import "../../src/js/views/add-bar.js" from "tests/unit/add-bar.test.js". Does the file exist?
[... 18 lines omitted ...]
 FAIL  tests/unit/task-list.test.js [ tests/unit/task-list.test.js ]
Error: Failed to resolve import "../../src/js/views/task-list.js" from "tests/unit/task-list.test.js". Does the file exist?
[... 19 lines omitted ...]
 Test Files  2 failed (2)
      Tests  no tests
[... 2 lines omitted ...]
```

### Green Phase
Stage 2 is stage 1 plus this task's files, with regenerated hashes. Each run used a fresh tree: `git archive HEAD` extracted, the stage files copied over, and a `node_modules` junction.

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


[... 1 lines omitted ...]


 Test Files  21 passed (21)
      Tests  504 passed (504)
   Start at  18:41:19
   Duration  3.81s (environment 55%, tests 20%, import 13%, transform 9%, worker 2%)

    Isolate  21 workers spawned · ~716ms startup each (spawn + environment, per file)
             at least ~1.43s faster with isolate: false — reuses workers across files instead of one per file
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

OK: 36 precached files match VERSION 2026-11-04.4.
```

Command: `E2E_PORT=8822 npm run test:e2e` (exit code 0)

```text
[... 81 lines omitted ...]
  73 passed (38.5s)
```

### Review Rework
Round 1 found that `render()` always detached the open menu, so any store change closed it and dropped focus.
Rendering now reopens an open status or More menu on the same row and item, and keeps focus on the same row control.
A row that leaves passes focus to the row at its place, or to a `fallbackFocus` control once no row is left.
Stage 2 now carries VERSION 2026-11-04.7, since `task-list.js` changed after the first stage 2 hashes.

The new tests ran against the first stage 2 in a fresh tree, before the fix.

Command: `npx vitest run tests/unit/task-list.test.js` (exit code 1)

```text
[... 5 lines omitted ...]
     × keeps an open status menu open, on the same item, when rows render again 16ms
     × keeps an open More menu open when rows render again 7ms
     × closes the menu and passes focus on when its row leaves 7ms
     × moves focus to the fallback control when the last row leaves 11ms
[... 3 lines omitted ...]
 FAIL  tests/unit/task-list.test.js > createTaskList > keeps an open status menu open, on the same item, when rows render again
AssertionError: expected true to be false // Object.is equality
[... 17 lines omitted ...]
 FAIL  tests/unit/task-list.test.js > createTaskList > keeps an open More menu open when rows render again
AssertionError: expected true to be false // Object.is equality
[... 17 lines omitted ...]
 FAIL  tests/unit/task-list.test.js > createTaskList > closes the menu and passes focus on when its row leaves
[... 11 lines omitted ...]
 FAIL  tests/unit/task-list.test.js > createTaskList > moves focus to the fallback control when the last row leaves
AssertionError: expected <body><div …(1)>…(3)</div>
[... 288 lines omitted ...]
 Test Files  1 failed (1)
      Tests  4 failed | 8 passed (12)
[... 2 lines omitted ...]
```

The fixed stage 2, in a fresh tree with regenerated hashes:

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


[... 1 lines omitted ...]


 Test Files  21 passed (21)
      Tests  508 passed (508)
   Start at  19:01:16
   Duration  4.69s (environment 56%, tests 21%, import 13%, transform 8%, worker 2%)

    Isolate  21 workers spawned · ~837ms startup each (spawn + environment, per file)
             at least ~1.67s faster with isolate: false — reuses workers across files instead of one per file
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

OK: 36 precached files match VERSION 2026-11-04.7.
```

Command: `E2E_PORT=8822 npm run test:e2e` (exit code 0)

```text
[... 81 lines omitted ...]
  73 passed (49.7s)
```
