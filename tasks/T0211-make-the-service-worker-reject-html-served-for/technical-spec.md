## Technical Specifications

### Declared Files
- src/service-worker.js
- tests/unit/service-worker.test.js
- docs/devops.md
- CHANGELOG.md

Mechanical command: `node scripts/check-sw-version.mjs --update` rewrites scripts/sw-precache-hashes.json.

### Behavior
- Install fetches each PRECACHE entry, then stores it only when it passes; any failure rejects the install, so the next visit retries.
- A response passes when `response.ok` is true and, for any entry other than `./` and `index.html`, its content type does not start with `text/html`.
- Fetch: a cached response with a `text/html` content type is ignored for requests whose mode is not `navigate`; the worker then fetches from the network.
- Navigations still get the cached start page.
- Replace `cache.addAll` with a loop over `fetch` and `cache.put`.

### Tests
- Unit: install rejects when a CSS entry returns HTML with 200; install rejects on a 404; install accepts valid responses and HTML for `index.html`.
- Unit: a cached HTML response for a `css/style.css` request with mode `no-cors` is skipped and the network response returns; navigations still return the cached start page.
- Integration: the service worker e2e spec still installs and serves offline from the real dev server.

Completion check: `npm test && npm run lint && npm run check:sw`
