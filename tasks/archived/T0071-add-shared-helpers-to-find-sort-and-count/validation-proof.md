## Walkthrough & Validation

Output blocks are verbatim; a line reading `[... n lines omitted ...]` marks a truncation to 40 lines.

### Round 1 red phase: tests before the helpers exist
Command: `npx vitest run tests/unit/list-find.test.js tests/unit/list-sort.test.js tests/unit/list-counts.test.js`
Exit code: 1

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0071-add-shared-helpers-to-find-sort-and-count

 ❯ tests/unit/list-sort.test.js (0 test)
 ❯ tests/unit/list-counts.test.js (0 test)
 ❯ tests/unit/list-find.test.js (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/list-counts.test.js [ tests/unit/list-counts.test.js ]
Error: Cannot find module '../../src/js/core/list-counts.js' imported from C:/Dev-Projects/todos.webapp/.plan/work/T0071-add-shared-helpers-to-find-sort-and-count/tests/unit/list-counts.test.js
 ❯ tests/unit/list-counts.test.js:2:1
      1| import { describe, expect, it } from 'vitest';
      2| import { countLists, countOf, EMPTY_COUNT } from '../../src/js/core/li…
       | ^
      3|
      4| const task = (id, status, activity, extra = {}) => ({ id, status, 'las…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  tests/unit/list-find.test.js [ tests/unit/list-find.test.js ]
Error: Cannot find module '../../src/js/core/list-find.js' imported from C:/Dev-Projects/todos.webapp/.plan/work/T0071-add-shared-helpers-to-find-sort-and-count/tests/unit/list-find.test.js
 ❯ tests/unit/list-find.test.js:2:1
      1| import { describe, expect, it } from 'vitest';
      2| import { FIND_MAX_LENGTH, findLists, foldText } from '../../src/js/cor…
       | ^
      3|
      4| const LISTS = [

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  tests/unit/list-sort.test.js [ tests/unit/list-sort.test.js ]
Error: Cannot find module '../../src/js/core/list-sort.js' imported from C:/Dev-Projects/todos.webapp/.plan/work/T0071-add-shared-helpers-to-find-sort-and-count/tests/unit/list-sort.test.js
 ❯ tests/unit/list-sort.test.js:2:1
[... 8 lines omitted ...]

 Test Files  3 failed (3)
      Tests  no tests
   Start at  00:30:10
   Duration  266ms (worker 97%, environment 3%)
```

### Round 2 red phase: `__proto__` regression test against the round 1 list-sort.js
Command: `npx vitest run tests/unit/list-sort.test.js`
Exit code: 1

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0071-add-shared-helpers-to-find-sort-and-count

 ❯ tests/unit/list-sort.test.js (13 tests | 2 failed) 27ms
   ❯ sortLists (13)
     × keeps the manual order for the inherited key __proto__ 6ms
     × keeps the manual order for the inherited key hasOwnProperty 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/list-sort.test.js > sortLists > keeps the manual order for the inherited key __proto__
TypeError: compare is not a function
 ❯ src/js/core/list-sort.js:29:46
     27| export function sortLists(lists, sort, counts) {
     28|   const compare = COMPARES[sort];
     29|   return compare ? [...lists].sort((a, b) => compare(a, b, counts)) : …
       |                                              ^
     30| }
     31|
 ❯ sortLists src/js/core/list-sort.js:29:31
 ❯ tests/unit/list-sort.test.js:39:18

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/unit/list-sort.test.js > sortLists > keeps the manual order for the inherited key hasOwnProperty
TypeError: Cannot convert undefined or null to object
 ❯ src/js/core/list-sort.js:29:46
     27| export function sortLists(lists, sort, counts) {
     28|   const compare = COMPARES[sort];
     29|   return compare ? [...lists].sort((a, b) => compare(a, b, counts)) : …
       |                                              ^
     30| }
     31|
 ❯ sortLists src/js/core/list-sort.js:29:31
[... 4 lines omitted ...]

 Test Files  1 failed (1)
      Tests  2 failed | 11 passed (13)
   Start at  00:29:53
   Duration  291ms (tests 37%, import 34%, transform 19%, worker 10%)
```

### Round 2 green phase: new tests, with the consumer integration test
Command: `npx vitest run tests/unit/list-find.test.js tests/unit/list-sort.test.js tests/unit/list-counts.test.js tests/unit/list-counts-consumers.test.js`
Exit code: 0

```text

 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0071-add-shared-helpers-to-find-sort-and-count


 Test Files  4 passed (4)
      Tests  36 passed (36)
   Start at  00:29:22
   Duration  1.24s (environment 57%, tests 16%, import 14%, transform 12%, worker 2%)
```

### Round 2 green phase: full suite
Command: `npm test`
Exit code: 0

```text

> todos-webapp@0.2.1-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp/.plan/work/T0071-add-shared-helpers-to-find-sort-and-count


 Test Files  59 passed (59)
      Tests  1170 passed (1170)
   Start at  00:29:25
   Duration  16.16s (environment 65%, tests 22%, import 10%, worker 2%, transform 2%)

    Isolate  59 workers spawned · ~1.31s startup each (spawn + environment, per file)
             at least ~9.72s faster with isolate: false — reuses workers across files instead of one per file
```

### Lint
Command: `npm run lint`
Exit code: 0

```text

> todos-webapp@0.2.1-pre lint
> eslint .
```

### Service worker version
Command: `npm run check:sw`
Exit code: 0

```text

> todos-webapp@0.2.1-pre check:sw
> node scripts/check-sw-version.mjs

OK: 75 precached files match VERSION 2026-11-08.4.
```
