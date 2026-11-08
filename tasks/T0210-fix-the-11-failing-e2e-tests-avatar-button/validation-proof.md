## Walkthrough & Validation
Before: `devops.py release 0.3.0 --dry-run` reported 11 failed e2e tests, 174 passed.
Fixes: the sync indicator takes pointer events again, account-menu links and the info-line Reset keep 44 px targets, and shell.spec.js expects the new status link.

```text
$ npm run test:e2e
  185 passed (2.2m)
$ npm run lint
(no output)
$ node scripts/check-sw-version.mjs
OK: 75 precached files match VERSION 2026-11-08.9.
```
