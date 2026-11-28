## Walkthrough & Validation

Added `scripts/site-files.mjs`, the `serve.mjs` help mapping, `scripts/stage-site.mjs`, the Pages staging step, and a network-first help cache in the service worker (VERSION 2026-11-28.3).

### Tests failed before the implementation

Command: `npx vitest run tests/unit/serve.test.js tests/unit/stage-site.test.js tests/unit/service-worker.test.js`
Exit code: 1

```
 Test Files  3 failed (3)
      Tests  3 failed | 42 passed (45)
 FAIL  tests/unit/service-worker.test.js > service worker help files > goes to the network first when a copy is cached
TypeError: result.body.text is not a function
 FAIL  tests/unit/service-worker.test.js > service worker help files > serves help files under the Pages subpath
AssertionError: expected false to be true // Object.is equality
```

The serve and stage-site files failed to import `site-files.mjs`, `resolveHelp`, and `stage-site.mjs`.

### New unit tests pass after the implementation

Command: `npx vitest run tests/unit/serve.test.js tests/unit/stage-site.test.js tests/unit/service-worker.test.js`
Exit code: 0

```
 Test Files  3 passed (3)
      Tests  88 passed (88)
```

### End-to-end spec

Command: `npx playwright test tests/e2e/backup.spec.js tests/e2e/service-worker.spec.js`
Exit code: 0

```
  ok 15 [chromium] › tests\e2e\service-worker.spec.js:118:1 › help files and the changelog load, then read offline from the cache (1.1s)
  15 passed (17.2s)
```

An earlier full run had one flaky failure in `backup.spec.js` (download canceled); it passed alone and in later full runs.

### Full check

Command: `python scripts/devops.py check`
Exit code: 0

```
 Test Files  69 passed (69)
      Tests  1858 passed (1858)
  287 passed (4.5m)
261 passed in 145.22s (0:02:25)
```

Earlier runs of this command failed on three issues, now fixed:
- Ruff `RUF007` in `tests/test_draw_wireframes.py`, which predates this task; fixed with `itertools.pairwise`.
- Ruff format in `scripts/draw-wireframes.py` and `tests/test_draw_wireframes.py`; fixed with `ruff format`.
- `tests/test_devops.py` copied `serve.mjs` without `site-files.mjs`; the copy list now includes it.
