## Walkthrough & Validation

### Red Phase
The new tests ran before uuid7.js and the store modules existed.

Command: `npx vitest run` (exit code 1)

```text
 FAIL  tests/unit/store-lists.test.js [ tests/unit/store-lists.test.js ]
Error: Cannot find module '../../src/js/store/db.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/store-lists.test.js
 FAIL  tests/unit/store-tasks.test.js [ tests/unit/store-tasks.test.js ]
Error: Cannot find module '../../src/js/store/db.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/store-tasks.test.js
 FAIL  tests/unit/uuid7.test.js [ tests/unit/uuid7.test.js ]
Error: Cannot find module '../../src/js/lib/uuid7.js' imported from C:/Dev-Projects/todos.webapp/tests/unit/uuid7.test.js
 Test Files  3 failed | 1 passed (4)
      Tests  23 passed (23)
```

### Green Phase

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  4 passed (4)
      Tests  61 passed (61)
   Start at  02:16:40
   Duration  414ms (import 49%, tests 35%, transform 10%, worker 6%)
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `python ../dev-guidelines/scripts/lint-markdown.py check docs CHANGELOG.md` (exit code 0)

```text
Starting lint-markdown v1.12.9-pre+5f5408e with configuration:
- Command: check
- Log file: none
- Log level: INFO
- Verbose: false
- Working directory: C:\Dev-Projects\todos.webapp
All 7 markdown files passed linting.
Finished lint-markdown check in 0.1s with status: succeeded
```

### Rework After Review Round 1

Command: `npm test` (exit code 0)

```text


 Test Files  4 passed (4)
      Tests  66 passed (66)
   Start at  02:19:22
   Duration  433ms (import 49%, tests 36%, transform 9%, worker 6%)
```

Command: `npm run lint` (exit code 0)

```text

> todos-webapp@0.1.0-pre lint
> eslint .
```

Command: `TZ=America/New_York npx vitest run` (exit code 1)

```text
'TZ' is not recognized as an internal or external command,
operable program or batch file.
```

Command: `TZ=Asia/Tokyo npx vitest run` (exit code 1)

```text
'TZ' is not recognized as an internal or external command,
operable program or batch file.
```
