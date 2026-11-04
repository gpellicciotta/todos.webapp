# DevOps
Development environment, planning workflow, and operational procedures for `todos.webapp`.

---

## Prerequisites
- Git, with access to the `gpellicciotta/todos.webapp` GitHub repository.
- The [plan](https://github.com/gpellicciotta/plan) CLI.
- Node.js 22.13 or later, with npm.
- Python 3.10 or later, with pytest and Ruff 0.17, for the documentation scripts.

---

## Web App
The app has no build step: [src](../src/) is the web root and the deployed folder.
Install the development tools once, plus the Chromium build that Playwright drives:

```bash
npm install
npx playwright install chromium
```

Day-to-day commands:

```bash
npm run serve        # serve src/ at http://127.0.0.1:8080/
npm test             # unit tests with Vitest, from tests/unit/
npm run lint         # ESLint, including Stroustrup brace style
npm run test:e2e     # Playwright end-to-end tests, from tests/e2e/
```

- [serve.mjs](../scripts/serve.mjs) uses Node.js built-ins only and disables caching; pass `--port` or `--root` to change them.
- Playwright starts and stops its own server on port 8754; set `E2E_PORT` to use another port.

### Service Worker and Offline Use
[service-worker.js](../src/service-worker.js) precaches the app shell and serves it cache first.
- Keep its `PRECACHE` list complete: add every new file under `src/`, outside `src/demo/`.
- [precache.test.js](../tests/unit/precache.test.js) fails on a missing or a stale entry.
- Bump `VERSION` with every change to a precached file, or installed apps keep the old files.
- The new worker installs on the next visit, then deletes the old cache.
- During development, the worker also serves stale files: tick Update on reload or Bypass for network.
  Both sit under Application, then Service workers, in Chrome DevTools.

Test offline use by hand:
1. Run `npm run serve` and open `http://127.0.0.1:8080/` once.
2. In DevTools, under Network, switch the throttling to Offline.
3. Reload; the app must start and navigate without network.

[pwa.spec.js](../tests/e2e/pwa.spec.js) runs the same check with `context.setOffline(true)`.
It also checks the manifest type and fields, and Chromium's installability errors.

### App Icons
[app-icon.svg](../src/img/app-icon.svg) is the source; the PNG icons of the manifest are rendered from it.
Render them again after changing the SVG:

```bash
node scripts/render-app-icons.mjs
```

---

## Wireframes
[draw-wireframes.py](../scripts/draw-wireframes.py) draws the UI wireframes of [ui-design.md](specs/ui-design.md).
Regenerate them after changing a screen, then check the script and its output:

```bash
python scripts/draw-wireframes.py docs/img/ui
python -m pytest tests
ruff check scripts tests
ruff format --check scripts tests
```

The tests fail when a shape leaves its frame, so overflow at 390 px shows up before review.

---

## Plan Store
Tasks live on the `plan` branch, checked out at `.plan/`; [PLAN.md](../PLAN.md) is a link into that checkout.
A fresh clone has no `.plan/` until you attach the store:

```bash
git clone https://github.com/gpellicciotta/todos.webapp.git
cd todos.webapp
plan init --store branch
```

Publish both refs when pushing: `main` for code and `plan` for tasks.

---

## Task Coordination Protocol
Tasks are managed only through the `plan` CLI:
1. Create: `plan tasks create "{{description}}"`, adding `--protocol adhoc` for small changes.
2. Start: `plan tasks start {{task-id}} --owner @{{agent}}` provisions a branch and worktree for standard tasks.
3. Execute: Work in the resolved workspace, keeping the task file in `.plan/tasks/` current.
4. Finalize: Pass all checks, update `CHANGELOG.md` and documentation, then run `plan tasks stop {{task-id}} --status completed`.
