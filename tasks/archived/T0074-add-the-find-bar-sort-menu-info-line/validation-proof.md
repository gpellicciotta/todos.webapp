# T0074 validation proof

## Failing before the code (unit tests)
Command: `npx vitest run tests/unit/lists.test.js tests/unit/list-sort.test.js tests/unit/settings.test.js`
Result: `Test Files  3 failed (3)`, `Tests  17 failed | 69 passed (86)`.
The e2e spec tests/e2e/lists-find.spec.js was written before the code but first ran after it.

## Passing after the code
- `npm test`: `Test Files  63 passed (63)`, `Tests  1662 passed (1662)`.
- `npm run lint`: no output, exit 0.
- `npm run check:sw`: `OK: 130 precached files match VERSION 2026-11-17.16.`
- `npx playwright test` (full): 236 passed, 3 failed before fixes.
  - bin-settings Keyboard shortcuts (2): stale expectations, missing the `l` row since T0073; updated with the new `/` row, then `2 passed`.
  - behaviors.spec.js popover keyboard test: also fails on the clean baseline (verified with my changes stashed); unrelated to this task.
- New e2e spec lists-find.spec.js and lists.spec.js, sidebar-find.spec.js, shell.spec.js: `48 passed`.

## Verbatim output

### npm test
```
 Test Files  63 passed (63)
      Tests  1662 passed (1662)
   Start at  05:48:46
   Duration  13.74s (environment 44%, tests 42%, import 9%, transform 3%, worker 1%, setup 1%)

    Isolate  63 workers spawned · ~803ms startup each (spawn + environment, per file)
             at least ~6.42s faster with isolate: false — reuses workers across files instead of one per file

```

### npm run lint
```

> todos-webapp@0.5.1-pre lint
> eslint .

```

### npm run check:sw
```

OK: 130 precached files match VERSION 2026-11-17.16.
```

### e2e (lists-find, lists, sidebar-find, bin-settings)
```
  ok 32 [chromium] › tests\e2e\sidebar-find.spec.js:77:1 › on a compact layout l opens Lists even with 20 lists (1.3s)
  ok 28 [chromium] › tests\e2e\sidebar-find.spec.js:29:1 › the find field filters the sidebar lists, counts matches, and opens the first one on Enter (4.3s)

  32 passed (21.7s)
```

### Failing before the code
```
 Test Files  3 failed (3)
      Tests  17 failed | 69 passed (86)
```
