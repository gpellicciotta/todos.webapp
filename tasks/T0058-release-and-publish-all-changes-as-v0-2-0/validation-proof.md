# T0058 validation proof

## Dry run

Command: `python scripts/devops.py release 0.2.0 --dry-run --backend-dir ../todos` (exit 0, tail):

```text
Release         : v0.2.0, dated 2026-11-07
Next version    : v0.2.1-pre
Files           : CHANGELOG.md, package.json, package-lock.json, src/js/version.js, src/service-worker.js, scripts/sw-precache-hashes.json
Checks          : ran: service worker, unit, lint, e2e, Ruff, pytest
Local commands, after the question:
  git commit -m "Released v0.2.0."
  git tag -a v0.2.0 -m "Released v0.2.0."
  git commit -m "Opened v0.2.1-pre development after releasing v0.2.0."
Commands that publish:
  git push --atomic origin main v0.2.0
  git push origin plan
  gh release create v0.2.0 --title v0.2.0 --notes "<the changelog entry of v0.2.0>"
Also published  : 1 commit(s) not yet on origin/main
  04b1b86 Completed task T0048: Let the All tasks dashboard group tasks by List, Due Date, or Status.
Backend pin     : todosWebappVersion=0.2.0 in ../todos; committed locally, never pushed or deployed

Dry run: nothing was changed.
```

## Release

Command: `python scripts/devops.py release 0.2.0 --backend-dir ../todos --yes` (exit 0, selected lines):

```text
[OK] Pushed main and v0.2.0 together.
[OK] Pushed plan.
https://github.com/gpellicciotta/todos.webapp/releases/tag/v0.2.0
[OK] Created the GitHub release v0.2.0.
[OK] Committed the pin todosWebappVersion=0.2.0 in ../todos; not pushed, not deployed.
     Next: deploy the todos server from that repository, then push its pin commit.
[OK] Released v0.2.0. Follow the Pages run in the Actions tab, then reload the site once.
```

## Pages

- Run 42386522036 (0995f56) failed in backup.spec.js:149, a race between the closed dialog and its close event; run 42375590938 failed the same test.
- Fix 7e87e50 (T0066) made run 42390447509 pass, and Deploy succeeded.
- The deployed `service-worker.js` holds VERSION 2026-11-07.9, like `src/`, and `js/version.js` holds 0.2.1-pre.
