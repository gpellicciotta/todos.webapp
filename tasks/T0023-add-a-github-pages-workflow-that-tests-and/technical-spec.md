## Technical Specifications

### Decisions
- The user decided on 2026-11-04: no custom domain yet; publish at the default GitHub Pages address.
- The app uses relative URLs, so it works under the `/todos.webapp/` sub-path; `TEC-11` gets its domain later.
- **[Decided]** Pin `checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`.
  These are the latest release majors on 2026-11-04; the Pages docs page still shows older majors.
- **[Decided]** Use Node.js `22`, the oldest line the `engines` range accepts; a bare range would pick the newest Node.js.
- **[Decided]** Enforce the VERSION bump with `scripts/check-sw-version.mjs` and the manifest `scripts/sw-precache-hashes.json`.
  Text files hash with LF endings, because local checkouts use CRLF and CI uses LF.
- **[Decided]** Keep `skipWaiting()` unchanged; docs/devops.md records the trade-off and the Update-toast alternative.
- **[Decided]** The gallery under `src/demo/` deploys too, since the whole `src/` folder is the artifact.

### Declared Files
- .github/workflows/pages.yml
- docs/devops.md
- scripts/check-sw-version.mjs
- tests/unit/check-sw-version.test.js
- package.json

Size estimate: 2 files, 120 lines

Mechanical command: `node scripts/check-sw-version.mjs --update` (writes `scripts/sw-precache-hashes.json`)

Size note: 5 files, 465 lines; the VERSION check follow-up added the script, its tests, and the npm script.
The workflow runs the check as a gate, so the two pieces ship together.

### Tests
- Unit: `tests/unit/check-sw-version.test.js` covers parsing, hashing, CRLF and binary handling, the verdict, and `--update`; the workflow itself has no logic to unit test.
- Integration: actionlint 1.7.12 accepts the workflow, and the checks it runs pass locally.

Completion check: `npm run check:sw && npm test && npm run lint && npm run test:e2e`, then human review of the workflow

### Follow-Ups From Earlier Reviews
- From T0034: enforce a service worker VERSION bump when a precached file changes, for example with a content hash check in CI.
- From T0034: consider letting old pages finish before `skipWaiting` deletes the previous cache.
