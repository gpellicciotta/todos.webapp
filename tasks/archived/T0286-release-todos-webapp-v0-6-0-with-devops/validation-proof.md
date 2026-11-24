## Walkthrough & Validation

The task names `--backend-dir ../todos`, which no longer exists.
The backend repository is `../todos.server`, which holds the `todosWebappVersion` pin and earlier pin commits.

### Preconditions
Command: `git fetch origin; git status -sb; head CHANGELOG.md; git ls-remote --tags origin v0.6.0` (exit 0)

```text
## main...origin/main [ahead 8]
## v0.5.1-pre
3:  "version": "0.5.1-pre",
export const VERSION = '0.5.1-pre';
(git ls-remote --tags origin v0.6.0 printed nothing; the last tag is v0.5.0)
```

### Dry run
Command: `python scripts/devops.py release 0.6.0 --dry-run --backend-dir ../todos.server` (exit 0)

```text
[!] .plan has uncommitted changes; the release does not publish them.
OK: 158 precached files match VERSION 2026-11-24.10.
integrity: PASS
conformance: PASS
 Test Files  68 passed (68)
      Tests  1819 passed (1819)
[... eslint and 280 e2e result lines omitted ...]
  282 passed (4.1m)
All checks passed!
4 files already formatted
215 passed in 117.48s (0:01:57)
Release         : v0.6.0, dated 2026-11-24
Next version    : v0.6.1-pre
Files           : CHANGELOG.md, package.json, package-lock.json, src/js/version.js, src/service-worker.js, scripts/sw-precache-hashes.json
Checks          : ran: service worker, unit, lint, e2e, Ruff, pytest
Local commands, after the question:
  git commit -m "Released v0.6.0."
  git tag -a v0.6.0 -m "Released v0.6.0."
  git commit -m "Opened v0.6.1-pre development after releasing v0.6.0."
Commands that publish:
  git push --atomic origin main v0.6.0
  git push origin plan
  gh release create v0.6.0 --title v0.6.0 --notes "<the changelog entry of v0.6.0>"
Backend pin     : todosWebappVersion=0.6.0 in ../todos.server; committed locally, never pushed or deployed

Dry run: nothing was changed.
```

### Release (2026-11-24, after T0296 and T0297)
The first dry run failed at `check:sw`; commit `1639b4c` bumped `VERSION` to `2026-11-24.11`.
Command: `python scripts/devops.py release 0.6.0 --dry-run --backend-dir ../todos.server` (exit 0)

```text
OK: 158 precached files match VERSION 2026-11-24.11.
integrity: PASS
conformance: PASS
      Tests  1823 passed (1823)
  283 passed (3.7m)
All checks passed!
216 passed in 93.46s (0:01:33)
Dry run: nothing was changed.
```

Command: `python scripts/devops.py release 0.6.0 --backend-dir ../todos.server --yes` (exit 0)

```text
 Test Files  68 passed (68)
      Tests  1823 passed (1823)
  283 passed (3.6m)
216 passed in 96.14s (0:01:36)
[OK] Pushed main and v0.6.0 together.
[OK] Pushed plan.
[OK] Created the GitHub release v0.6.0.
[OK] Committed the pin todosWebappVersion=0.6.0 in ../todos.server; not pushed, not deployed.
[OK] Released v0.6.0. Follow the Pages run in the Actions tab, then reload the site once.
```

Command: `git ls-remote --tags origin v0.6.0; gh release view v0.6.0 --json tagName,name,isDraft,url,publishedAt` (exit 0)

```text
ed492303c7c6cc68bfe531a4bc9aa601e980b6cf	refs/tags/v0.6.0
{"isDraft":false,"name":"v0.6.0","publishedAt":"2026-11-24T15:33:53Z","tagName":"v0.6.0","url":"https://github.com/gpellicciotta/todos.webapp/releases/tag/v0.6.0"}
```
