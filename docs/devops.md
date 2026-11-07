# DevOps
Development environment, planning workflow, and operational procedures for `todos.webapp`.

---

## Prerequisites
- Git, with access to the `gpellicciotta/todos.webapp` GitHub repository.
- The [plan](https://github.com/gpellicciotta/plan) CLI.
- Node.js 22.13 or later, with npm.
- Python 3.10 or later, with pytest and Ruff 0.17, for the documentation scripts and `scripts/devops.py`.
- The GitHub CLI `gh`, logged in, for the GitHub release of `devops.py release`; pass `--no-github-release` to go without.

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
npm run test:contract # opt-in: the sync client against a real todos server; see Contract Tests
npm run lint         # ESLint, including Stroustrup brace style
npm run test:e2e     # Playwright end-to-end tests, from tests/e2e/
npm run test:perf    # Playwright performance spec with 5000 tasks, alone
```

[devops.py](../scripts/devops.py) wraps the same checks, and adds the release:

```bash
python scripts/devops.py lint      # ESLint, Ruff check, and Ruff format check
python scripts/devops.py test      # Vitest, then pytest
python scripts/devops.py e2e       # Playwright end-to-end tests
python scripts/devops.py check     # everything the Pages test job runs, plus Ruff and pytest
python scripts/devops.py release   # see Release Procedure
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
3. `GET {{server}}/api/auth-token/callback?authorization-code={{code}}` answers JSON with `email` and `one-time-passcode`; older servers redirected to `/sign-in?opc=…&email=…`.
4. `POST {{server}}/api/auth-token` with `Basic {{email}}:{{opc}}` returns `bearer-token` and `expiration-time`.
5. `GET {{server}}/api/users/me` names the account; `DELETE {{server}}/api/auth-token` signs out.

Sources, read in the sibling repositories:
- Auth: `docs/web-api.md`, Authentication and Authorization, and `webapp/js/view/sign-in-view.mjs`.
- ToDo's: `TodosRestController.authCallback` and the `/api/auth-token` routes, and `clients/js/src/client.mjs`.
- support.js: `redirectToAuth` in `src/net.mjs`, which the legacy web app uses.

Before connecting works in production, the services need these changes:
- Auth must accept `{{app}}/#/connect` as the `app-redirect-url` of the `todos` application.
- ToDo's sends CORS headers only in test mode; the app's origin needs them on the routes above.
  They include `/sign-in`, where the callback redirects, since the app's fetch follows that redirect.
- The callback should answer `403` for an account without an access grant; it answers `401` today.

The end-to-end tests mock Auth and ToDo's with Playwright routes on the app's own origin.
Playwright skips the request a mocked redirect leads to, so a cross-origin mock would reach a live host.
[playwright.config.js](../playwright.config.js) blocks every host but the local server; network-guard.spec.js proves it.

### Contract Tests
[sync.contract.test.js](../tests/contract/sync.contract.test.js) runs the sync client against a real todos server, so protocol drift shows before a release.
The mocked tests in `tests/unit` cannot see a change of the server; this suite can.

```bash
TODOS_SERVER_DIR=../todos npm run test:contract
```
```powershell
$env:TODOS_SERVER_DIR = "../todos"; npm run test:contract
```

- The suite is opt-in: without `TODOS_SERVER_DIR` it skips with one message. `npm test` and CI never run it.
- `TODOS_SERVER_DIR` names a todos checkout that has Java, Python, and a built server, as `python scripts/devops.py server start` needs.
- [server.js](../tests/contract/server.js) starts it with `devops.py server start --memory-db --background` on a free port, and stops it afterwards.
  It passes a temporary environment file with no secrets, so the checkout needs no `.env`.
- The server signs users in through Auth, so the helper runs a local stand-in for Auth that grants two known codes: a user and an admin.
  The tests sign in through the real `/api/auth-token` routes of the server with the session code of the app.
- The environment file turns off the per-IP throttle and sets `TODOS_SYNC_MIN_CLIENT_VERSIONS=todos.webapp=0.1.0`.
  A client that reports version `0.0.1` then gets `426`.
- The tests use the sync modules directly on `fake-indexeddb`, with real `fetch` and no browser.
  They cover first-connect adoption, same-named list merge, two-device merge, a purged-list tombstone, `410`, and `426`.
- The `410` test forges a cursor above the newest revision. Only the purge job raises the tombstone floor, and a running server has no route for it; the todos tests cover that path.
- A server started with `--memory-db` answers `500` to a new note, since its two in-memory repositories do not share users.
  The note test uses `it.fails` until the todos task T0207 fixes that; it then turns red, so switch it to `it`.

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
A new worker precaches its files, then waits; it does not call `skipWaiting()` on install (`TEC-19`).
The page shows a lasting Update toast, "A new version is ready", through [sw-update.js](../src/js/ui/sw-update.js).
- Update posts `{type: 'skip-waiting'}` to the waiting worker, which calls `skipWaiting()`.
  The page reloads once, when `controllerchange` fires after that click.
- The worker's `activate` handler deletes the previous cache, then claims every open page.
- An ignored toast leaves the app fully usable on the old version; the old worker and its cache keep serving.
- Dismissing the toast hides it until the next start; the waiting worker stays.
- The first install has no waiting worker and no toast: the page already runs the new files.
- Another tab that sees `controllerchange` without an Update click shows the reload banner.
- Benefit: no open page mixes old modules with new files, so a store migration can rely on one version per tab.
- Database upgrades: a tab closes its connection on `versionchange` and shows the reload banner.
  An upgrade that an old tab blocks fails with "Close other tabs of ToDo's to finish the update."
- Test it by hand: serve version A, load it, serve version B, reload, and confirm the toast appears while the page stays on A.

### App Icons
The app icon and the favicon are one file: the slightly rounded hexagon with a fat navy 600 border, a white inside, and a navy check.
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
[devops.py](../scripts/devops.py) cuts a release from `main`; the sections above describe what it automates.

```bash
python scripts/devops.py release 0.2.0 --dry-run --backend-dir ../todos   # run the checks, print the plan, change nothing
python scripts/devops.py release 0.2.0 --backend-dir ../todos             # the same, then ask y/N and release
```

1. Preconditions: on `main`, a clean tree, not behind `origin/main` or `origin/plan`, and the tag `v0.2.0` free locally and on `origin`.
   The changelog must start with one `-pre` heading, the version must exceed the last release,
   and every file the release rewrites must hold the text to replace.
2. Checks: the service worker check, `npm test`, `npm run lint`, `npm run test:e2e`, Ruff, and pytest.
   A dry run runs them too; `--skip-checks` skips them.
3. The plan: the files, the local commits and tag, commits that the push publishes with them, and the exact publish commands.
   A dry run stops here.
   Otherwise the script asks `y/N`; a closed input counts as no. Nothing changes before a yes.
4. Release commit `Released v0.2.0.`, tagged `v0.2.0`: the `-pre` heading becomes `## v0.2.0 [released: {{date}}]`.
   `package.json`, `package-lock.json`, and [version.js](../src/js/version.js) take the version and the build date.
   The service worker `VERSION` and the hash manifest are bumped, then `check:sw` and `npm test` verify the commit.
5. Next commit `Opened v0.2.1-pre development after releasing v0.2.0.`: an empty `-pre` heading and `-pre` versions.
6. Publish: `git push --atomic origin main v0.2.0`, so the tag never reaches `origin` without `main`.
   Then `git push origin plan` and a GitHub release with the changelog entry.
7. With `--backend-dir`: once the tag is on `origin`, the `todosWebappVersion` pin in the todos repository's
   `gradle.properties` becomes `0.2.0`. The script commits it on the checked-out branch there and stops.
   Run it from the repository root, since a relative `--backend-dir` is resolved against the current folder.
   It never pushes that repository and never deploys the server.
8. Follow the Pages run in the Actions tab, then open the site, reload once, and check that the new worker is active.
   One push carries both commits, so the live site reports the next `-pre` version under Settings, About; the tag marks the release commit.

- Options: `--skip-checks` skips the check run and the unit tests of the release commit, `--yes` skips only the question,
  and `--no-github-release` skips the GitHub release.
- If editing or verifying fails, the script restores the edited files and prints the local state and how to undo it:
  `git tag -d v0.2.0` and `git reset --hard {{sha}}`. A rejected push leaves `origin` unchanged.
- If a step after the push fails, such as the `plan` push, the GitHub release, or the pin, the script finishes the others,
  lists what is left with the command to run, and exits with code 1.
- To redeploy without a new commit, run the Pages workflow by hand from the Actions tab.
- To deploy the server afterward, deploy it from the todos repository, then push its pin commit.

### Hosting Origins
`TEC-11` splits hosting across two origins:
- The Cloud Run server hosts the app at `https://todos.pellicciotta.com/`; the app and its API share that origin.
- GitHub Pages at `https://gpellicciotta.github.io/todos.webapp/` stays a bring-your-own-server copy.
  Its users set the server URL themselves.

Each origin has its own local data, so a copy at one address does not see the data of the other.
Export a backup at one address and import it at the other to move data.

The Pages workflow needs no custom domain, `CNAME` file, or DNS record.

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
