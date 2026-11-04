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
npm run test:perf    # Playwright performance spec with 5000 tasks, alone
```

- [serve.mjs](../scripts/serve.mjs) uses Node.js built-ins only and disables caching; pass `--port` or `--root` to change them.
- Playwright starts and stops its own server on port 8754; set `E2E_PORT` to use another port.
- `test:e2e` leaves out [performance.spec.js](../tests/e2e/performance.spec.js), since parallel tests skew its timings.
- `test:perf` runs it through [playwright.perf.config.js](../playwright.perf.config.js), in one worker.
  It asserts first rows within 400 ms and a one-task update within 200 ms, on desktop Chromium.

### Service Worker and Offline Use
[service-worker.js](../src/service-worker.js) precaches the app shell and serves it cache first.
- Keep its `PRECACHE` list complete: add every new file under `src/`, outside `src/demo/`.
- [precache.test.js](../tests/unit/precache.test.js) fails on a missing or a stale entry.
- Bump `VERSION` with every change to a precached file, or installed apps keep the old files.
- The new worker installs on the next visit, then deletes the old cache.
- [check-sw-version.mjs](../scripts/check-sw-version.mjs) enforces the bump in CI; see the next section.
- During development, the worker also serves stale files: tick Update on reload or Bypass for network.
  Both sit under Application, then Service workers, in Chrome DevTools.

Test offline use by hand:
1. Run `npm run serve` and open `http://127.0.0.1:8080/` once.
2. In DevTools, under Network, switch the throttling to Offline.
3. Reload; the app must start and navigate without network.

[pwa.spec.js](../tests/e2e/pwa.spec.js) runs the same check with `context.setOffline(true)`.
It also checks the manifest type and fields, and Chromium's installability errors.

### Auth Integration
[auth.js](../src/js/sync/auth.js) holds the sign-in contract; [session.js](../src/js/sync/session.js) stores the session.
1. Sign in opens `https://auth.pellicciotta.com/sign-in?app-name=todos&app-redirect-url={{app}}/#/connect`.
2. Auth returns to `{{app}}/#/connect?authorization-code={{code}}`; the shell strips the code before routing.
3. `GET {{server}}/api/auth-token/callback?authorization-code={{code}}` redirects to `/sign-in?opc=…&email=…`.
4. `POST {{server}}/api/auth-token` with `Basic {{email}}:{{opc}}` returns `bearer-token` and `expiration-time`.
5. `GET {{server}}/api/users/me` names the account; `DELETE {{server}}/api/auth-token` signs out.

Sources, read in the sibling repositories:
- Auth: `docs/web-api.md`, Authentication and Authorization, and `webapp/js/view/sign-in-view.mjs`.
- ToDo's: `TodosRestController.authCallback` and the `/api/auth-token` routes, and `clients/js/src/client.mjs`.
- support.js: `redirectToAuth` in `src/net.mjs`, which the legacy web app uses.

Before connecting works in production, the services need these changes:
- Auth must accept `{{app}}/#/connect` as the `app-redirect-url` of the `todos` application.
- ToDo's sends CORS headers only in test mode; the app's origin needs them on the routes above.
- The callback should answer `403` for an account without an access grant; it answers `401` today.

The end-to-end tests mock Auth and ToDo's with Playwright routes on the app's own origin.
Playwright skips the request a mocked redirect leads to, so a cross-origin mock would reach a live host.
[playwright.config.js](../playwright.config.js) blocks every host but the local server; network-guard.spec.js proves it.

### Service Worker Version Check
[sw-precache-hashes.json](../scripts/sw-precache-hashes.json) records `VERSION` and a SHA-256 hash per precached file.
`npm run check:sw` fails when a precached file changed but `VERSION` did not.
It also fails when `VERSION` moved but the manifest was not updated.
Text files hash with LF line endings, so Windows and CI checkouts agree.

After changing a precached file:
1. Bump `VERSION` in [service-worker.js](../src/service-worker.js).
2. Rewrite the manifest, then commit it with the change:

```bash
node scripts/check-sw-version.mjs --update
npm run check:sw
```

`--update` refuses to write while `VERSION` is unchanged, so the bump cannot be skipped.

### Service Worker Updates
The new worker calls `skipWaiting()` right after it precaches, then claims every open page.
Its `activate` handler then deletes the previous cache.
- Benefit: every page uses the new version on its next request, without closing all tabs.
- Cost: a page opened before the update keeps its loaded modules but fetches later files from the new cache.
  A long-open tab can therefore mix old and new code until it reloads.
- Today the risk is small: the app loads all its modules at start-up.
- Alternative: wait in the `waiting` state and show an Update toast.
  The toast posts a message, and the worker calls `skipWaiting()` only then.
- Revisit this when the app loads modules lazily or changes its stored data format.

### App Icons
[app-icon.svg](../src/img/app-icon.svg) is the source; the PNG icons of the manifest are rendered from it.
Render them again after changing the SVG:

```bash
node scripts/render-app-icons.mjs
```

---

## Deployment
[pages.yml](../.github/workflows/pages.yml) tests the app, then publishes [src](../src/) to GitHub Pages.
It runs on every push to `main`, and by hand from the Actions tab.
- The test job runs `npm ci`, `npm run check:sw`, `npm test`, `npm run lint`, and `npm run test:e2e`.
- The deploy job runs only after the test job passes, in the `github-pages` environment.
- It uploads `src/` unchanged, since the app has no build step.
- Only one deployment runs at a time; a newer run waits for the current one.

The site is served at the default address, `https://gpellicciotta.github.io/todos.webapp/`.
The app uses relative URLs, so it works under the `/todos.webapp/` sub-path.

### First-Time Setup
Do this once, before the first push of the workflow:
1. Open the repository on GitHub, then Settings, then Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Push `main`; the Pages workflow deploys, and its summary shows the site URL.

Settings, then Environments, then `github-pages` limits which branches may deploy.
Keep it limited to `main`.

### Release Procedure
1. Pass the checks locally: `npm run check:sw`, `npm test`, `npm run lint`, and `npm run test:e2e`.
2. Bump `VERSION` and rewrite the hash manifest whenever a precached file changed.
3. Push `main`, then follow the Pages run in the Actions tab.
4. Open the site, reload once, and check that the new worker is active in DevTools.

Run the workflow by hand to redeploy without a new commit.

### Custom Domain Later
`TEC-11` gets its own domain later; the default address serves until then.
1. Verify the domain under the GitHub account settings first; this prevents domain takeovers.
2. In Settings, then Pages, enter the domain under Custom domain, then save.
3. At the DNS provider, add a `CNAME` record for a subdomain, pointing to `gpellicciotta.github.io`.
   For an apex domain, add the `A` and `AAAA` records that GitHub lists instead.
4. Once the certificate is ready, select Enforce HTTPS; this can take up to 24 hours.

A workflow deployment needs no `CNAME` file, and GitHub ignores one if present.
Moving to a new domain gives the app a new origin, so its local data does not follow.
Export a backup at the old address and import it at the new one.

See [Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

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
