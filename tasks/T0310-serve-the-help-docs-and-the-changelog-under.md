---
id: T0310
owner: ~
needs: ['T0309']
branch: —
worktree: —
status: ready
started_at: —
ended_at: —
review: agent
preview: none
protocol: standard
---
# T0310: Serve the help docs and the changelog under help/ locally and on Pages, cached for offline use

## Goals
Serve `docs/tutorial/*.md` and `CHANGELOG.md` at `help/` paths, so the Help screen of T0311 can fetch them.
The development server maps the paths to the repository files, and the Pages deploy copies them into its artifact.
No copies are committed under `src/`, so editing a doc or the changelog needs no sync step.
The service worker caches each help file after its first load, so Help works offline.
Details are in [technical-spec.md](T0310-serve-the-help-docs-and-the-changelog-under/technical-spec.md).

## Task Execution Steps
- [ ] **[Implement]** Write unit tests for the help mounts, the staging script, and the help cache.
- [ ] **[Implement]** Write the end-to-end test that fetches help files, then reads them offline.
- [ ] **[Verify]**    Run the new tests and confirm they fail.
- [ ] **[Implement]** Add the shared mount list, the serve.mjs mapping, and stage-site.mjs.
- [ ] **[Implement]** Stage the Pages artifact with stage-site.mjs, and ignore its output folder.
- [ ] **[Implement]** Cache help files network first in the service worker, and bump VERSION.
- [ ] **[Verify]**    Run `python scripts/devops.py check` and confirm it passes.
- [ ] **[Doc]**       Update docs/devops.md and CHANGELOG.md.
- [ ] **[Review]**    Obtain review approval of the finished work before completion.

## Execution Log
- [2026-11-28] **[Doc]**
  Companion task file scaffolded at task creation.

- [2026-11-28] **[Decided]**
  Mapped help paths at serve and deploy time instead of committing copies, which `plan tasks stop` changelog edits would break.
