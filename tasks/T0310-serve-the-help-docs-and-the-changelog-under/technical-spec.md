## Technical Specifications

The app has no build step: Pages deploys `src/` as committed, and `scripts/serve.mjs` serves `src/` locally.
The help docs (T0309) and `CHANGELOG.md` live outside `src/`, so this task makes both servers expose them.

### Served Paths
| Served path               | Repository source                  |
| :------------------------ | :--------------------------------- |
| `help/welcome.md`         | `docs/tutorial/welcome.md`         |
| `help/getting-started.md` | `docs/tutorial/getting-started.md` |
| `help/faq.md`             | `docs/tutorial/faq.md`             |
| `help/CHANGELOG.md`       | `CHANGELOG.md`                     |

- **[Decided]** The list is explicit, not a glob, so no other repository file is ever served.
- **[Decided]** No copies are committed under `src/`.
  Reason: `plan tasks stop` edits `CHANGELOG.md` on every task, so a committed copy would drift after each task.
  Rejected: a sync script with a CI check, which would fail after every task completion.

### Shared Mount List
- Add `scripts/site-files.mjs`, which exports the table above as `HELP_FILES`: served path to repository-relative source.
- `serve.mjs` and `stage-site.mjs` both import it, so local and deployed paths never differ.
- Use Node.js built-ins only, like the other scripts.

### Development Server
- `serve.mjs` answers a `GET` or `HEAD` for a served help path with its source file, relative to the repository root.
- It adds `.md` to `CONTENT_TYPES` as `text/markdown; charset=utf-8`, with `cache-control: no-store` as for other files.
- A missing source answers 404; other `help/` paths keep the normal `src/` lookup, which answers 404.
- The mapping applies with the default root; `--root` without the default keeps today's behavior.

### Pages Artifact
- Add `scripts/stage-site.mjs <out-dir>`, following the `cli-guidelines` skill: `--help`, usage errors exit 2.
- It copies `src/` into the output folder, then each help file to its served path.
- It exits 1, naming the file, when a source is missing, and refuses an output folder that exists and is not empty.
- In `.github/workflows/pages.yml`, the deploy job runs `node scripts/stage-site.mjs _site` and uploads `_site`.
- Add `_site/` to `.gitignore`.

### Service Worker
- Help files stay out of `PRECACHE`, since they live outside `src/` and the precache check hashes `src/` files only.
- Same-origin `GET` requests for `help/*.md` go network first:
  - An OK, non-HTML answer is stored in the current `CACHE` and returned.
  - A network failure returns the cached copy, or rethrows when none exists.
- Other requests keep the cache-first strategy; update the header comment to describe both.
- Bump `VERSION`, then run `node scripts/check-sw-version.mjs --update`.

### Declared Files
- scripts/serve.mjs
- src/service-worker.js
- .github/workflows/pages.yml
- .gitignore
- docs/devops.md
- tests/unit/serve.test.js
- tests/unit/service-worker.test.js
- tests/e2e/service-worker.spec.js

Added files, outside the size count: `scripts/site-files.mjs`, `scripts/stage-site.mjs`, `tests/unit/stage-site.test.js`.

Mechanical command: node scripts/check-sw-version.mjs --update
Mechanical files: scripts/sw-precache-hashes.json

### Tests
- Unit: `serve.mjs` answers each help path with its source and `text/markdown`, and 404s other help paths.
- Unit: `stage-site.mjs` copies `src/` and the help files into a temporary folder, fails on a missing source, and refuses a non-empty folder.
- Unit: the worker stores a fetched help file, serves the cached copy offline, and keeps cache first for app files.
- Integration: Playwright fetches `help/faq.md` and `help/CHANGELOG.md` through the app, goes offline, and reads both again.

Completion check: python scripts/devops.py check

Size estimate: 8 files, 260 lines
