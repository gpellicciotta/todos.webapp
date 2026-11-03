## Walkthrough & Validation

### Red Phase
The tests ran before scripts/serve.mjs and src/index.html existed.

Command: `npx vitest run` (exit code 1)

```text
[... 13 lines omitted ...]
       | ^
      6|
      7| let root;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  00:18:29
   Duration  408ms (worker 96%, environment 4%)
```

Command: `npx playwright test` (exit code 1)

```text
[... 10 lines omitted ...]
[WebServer]     at node:internal/main/run_main_module:36:49 {
[WebServer]   code: 'MODULE_NOT_FOUND',
[WebServer]   requireStack: []
[WebServer] }
[WebServer] 
[WebServer] Node.js v22.14.0
Error: Process from config.webServer was not able to start. Exit code: 1
```

### Green Phase

Command: `npm test` (exit code 0)

```text

> todos-webapp@0.1.0-pre test
> vitest run


 RUN  v5.1.0 C:/Dev-Projects/todos.webapp


 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  00:19:32
   Duration  333ms (tests 51%, import 35%, transform 8%, worker 5%)
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


Running 2 tests using 2 workers

  ok 1 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 390 px (370ms)
  ok 2 [chromium] › tests\e2e\index.spec.js:9:3 › index page loads cleanly at 1440 px (329ms)

  2 passed (2.0s)
```

Command: `node scripts/serve.mjs --help` (exit code 0)

```text
Usage: node scripts/serve.mjs [options]

Serve the web app's static files on localhost, with caching disabled.

Options:
  --port <port>    port to listen on (default: 8080; 0 picks a free port)
  --host <host>    host to bind (default: 127.0.0.1)
  --root <folder>  folder to serve (default: src)
  -h, --help       show this help message and exit
```

Command: `python ../dev-guidelines/scripts/lint-markdown.py check docs README.md CHANGELOG.md` (exit code 0)

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

### Notes
- `npm audit` reports 6 moderate advisories in minimatch, pulled in by the ESLint development tooling.
  The app does not ship these packages; upgrading needs newer ESLint releases.
