## Walkthrough & Validation

New tests first failed because the goal fields and version 6 were missing.

```text
$ npx vitest run tests/unit/occurrences.test.js tests/unit/store-tasks.test.js tests/unit/store-db.test.js   (before implementing; exit code 1)
 ❯ tests/unit/occurrences.test.js (43 tests | 5 failed)
     × gives the default rules the goal fields and a null start time
     × opens an occurrence with the goal snapshot, progress 0, and no time spent
     × keeps progress equal to the completion count through events
     × keeps goal-target equal to target-count through a rule edit
     × resets progress with the count when a recurring period refolds or the display rule applies
 ❯ tests/unit/store-db.test.js (13 tests | 2 failed)
     × is version 6
     × fills the goal fields of rules and occurrences, mirrors equal to them, and keeps the counts and statuses
 ❯ tests/unit/store-tasks.test.js (50 tests | 1 failed)
     × stores the goal rules and the occurrence snapshot, and keeps the mirrors through events and edits
AssertionError: expected 5 to be 6 // Object.is equality
```

After implementing, the whole suite and lint pass.

```text
$ npx vitest run   (exit code 0)
 Test Files  69 passed (69)
      Tests  1866 passed (1866)
   Duration  20.58s (tests 47%, environment 40%, import 9%, transform 2%, worker 1%, setup 1%)
```

```text
$ npm run lint   (exit code 0)
> todos-webapp@0.6.1-pre lint
> eslint .
```
