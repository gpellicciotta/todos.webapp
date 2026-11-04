## Walkthrough & Validation

### Summary
- `openDatabase` closes its connection on `versionchange` and calls `onVersionChange`.
- A `blocked` open rejects with a `blocked` StoreError; a late success closes at once.
- The facade gained `subscribe()`, and `broadcast: true` relays writes over a BroadcastChannel.
- local-store.md gained the Connections and Change Notifications sections.

Each run used a scratch tree: `git archive HEAD` extracted, the stage files overlaid, and `node_modules` linked.
End-to-end runs set a free `E2E_PORT` per run.

### Red Phase
The new store tests ran against HEAD, before the db.js change.

Command: `npx vitest run tests/unit/store-db.test.js` (exit code 1)

```text
 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0032-red
[... 3 lines omitted ...]
 ❯ tests/unit/store-db.test.js (4 tests | 4 failed) 10020ms
[... 1 lines omitted ...]
     × closes its connection when a newer version opens, and reports it 5006ms
     × fails with a blocked StoreError while an older connection stays open 5001ms
[... 1 lines omitted ...]
     × tells subscribers after each write, but not after reads 2ms
     × tells subscribers of writes made by another connection with broadcasting on 9ms
[... 1 lines omitted ...]
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
[... 1 lines omitted ...]
 FAIL  tests/unit/store-db.test.js > openStore connection handling > closes its connection when a newer version opens, and reports it
Error: Test timed out in 5000ms.
[... 1 lines omitted ...]
 ❯ tests/unit/store-db.test.js:37:3
[... 9 lines omitted ...]
 FAIL  tests/unit/store-db.test.js > openStore connection handling > fails with a blocked StoreError while an older connection stays open
Error: Test timed out in 5000ms.
[... 1 lines omitted ...]
 ❯ tests/unit/store-db.test.js:47:3
[... 2 lines omitted ...]
     47|   it('fails with a blocked StoreError while an older connection stays …
[... 6 lines omitted ...]
 FAIL  tests/unit/store-db.test.js > store change notifications > tells subscribers after each write, but not after reads
TypeError: store.subscribe is not a function
 ❯ tests/unit/store-db.test.js:65:31
[... 9 lines omitted ...]
 FAIL  tests/unit/store-db.test.js > store change notifications > tells subscribers of writes made by another connection with broadcasting on
AssertionError: promise rejected "TypeError: first.subscribe is not a funct…" instead of resolving
 ❯ tests/unit/store-db.test.js:86:26
[... 9 more kept lines omitted ...]
[... 6 lines omitted ...]
 ❯ tests/unit/store-db.test.js:84:21
[... 9 lines omitted ...]
 Test Files  1 failed (1)
      Tests  4 failed (4)
     Errors  1 error
   Start at  17:08:41
   Duration  10.33s (tests 99%, import 1%)
```

### Green Phase
The completion check ran at this task's own stage.

Command: `npm test` (exit code 0)

```text
> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Users/giova/AppData/Local/Temp/claude/c--Dev-Projects-todos-webapp/2ef3bbc3-e820-4103-9d60-421b54f7c558/scratchpad/trees/T0032-green


 Test Files  16 passed (16)
      Tests  438 passed (438)
   Start at  17:08:52
   Duration  2.59s (environment 51%, tests 25%, import 19%, transform 3%, worker 2%)

    Isolate  16 workers spawned · ~568ms startup each (spawn + environment, per file)
             at least ~731ms faster with isolate: false — reuses workers across files instead of one per file
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
Running 55 tests using 4 workers
[... 70 lines omitted ...]
  ok 41 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 390 px (13.1s)
  ok 45 [chromium] › tests\e2e\gallery-controls.spec.js:121:3 › every keyboard stop in the control sections shows a focus ring at 1440 px (12.8s)
[... 1 lines omitted ...]
  55 passed (37.3s)
```

### Visual Check
No visual change: the store has no user interface.
