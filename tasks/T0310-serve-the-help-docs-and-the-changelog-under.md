---
id: T0310
owner: "@claude"
session: claude-20261128-20c407
needs: []
branch: task/T0310-serve-the-help-docs-and-the-changelog-under
worktree: .plan/work/T0310-serve-the-help-docs-and-the-changelog-under
status: active
started_at: "2026-11-28T00:34:10Z"
ended_at: —
review: agent
preview: none
protocol: standard
usage:
  worker: {turns: 2, duration_s: 1814.5, input: 10, output: 1052, cache_read: 326093, cache_write: 6539}
work_duration: 1850.0
---
# T0310: Serve the help docs and the changelog under help/ locally and on Pages, cached for offline use

## Goals
Serve `docs/tutorial/*.md` and `CHANGELOG.md` at `help/` paths, so the Help screen of T0311 can fetch them.
The development server maps the paths to the repository files, and the Pages deploy copies them into its artifact.
No copies are committed under `src/`, so editing a doc or the changelog needs no sync step.
The service worker caches each help file after its first load, so Help works offline.
Details are in [technical-spec.md](T0310-serve-the-help-docs-and-the-changelog-under/technical-spec.md).

## Task Execution Steps
- [x] **[Implement]** Write unit tests for the help mounts, the staging script, and the help cache.
- [x] **[Implement]** Write the end-to-end test that fetches help files, then reads them offline.
- [x] **[Verify]**    Run the new tests and confirm they fail.
- [x] **[Implement]** Add the shared mount list, the serve.mjs mapping, and stage-site.mjs.
- [x] **[Implement]** Stage the Pages artifact with stage-site.mjs, and ignore its output folder.
- [x] **[Implement]** Cache help files network first in the service worker, and bump VERSION.
- [x] **[Verify]**    Run `python scripts/devops.py check` and confirm it passes.
- [x] **[Doc]**       Update docs/devops.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Decided]**
  Mapped help paths at serve and deploy time instead of committing copies, which `plan tasks stop` changelog edits would break.

- [2026-11-28] **[Decided]**
  The user accepted that Help works offline only after a first online visit, so help files stay out of the precache.

- [2026-11-28] **[Verify]**
  Recorded task outcomes.
  - Files touched: 11.
  - Lines touched: 349.
  - Reopenings: 0.

- [2026-11-28] **[Decided]**
  Fixed unrelated Ruff failures and the test_devops.py copy list so devops check passes.

- [2026-11-28] **[Implement]**
  Added help mounts, stage-site.mjs, Pages staging, and the network-first help cache with VERSION 2026-11-28.3.

- [2026-11-28] **[Doc]**
  Documented Help Files in docs/devops.md and added the CHANGELOG entry.

- [2026-11-28] **[Verify]**
  New tests failed first: 3 test files failed before the implementation.

- [2026-11-28] **[Verify]**
  devops check exited 0: 1858 Vitest, 287 Playwright, 261 pytest passed.

