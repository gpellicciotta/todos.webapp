## Technical Specifications

### Decisions
- **[Decided]** `src/` is the web root and the deployed folder; there is no build step (`TEC-7`).
- **[Decided]** Source files use the `.js` extension with `"type": "module"` in package.json.
- **[Decided]** Node.js 22 LTS or later, declared in `engines`; Python stays for the wireframe script only.
- Scripts: `npm test` (Vitest), `npm run lint` (ESLint), `npm run test:e2e` (Playwright), `npm run serve`.
- `scripts/serve.mjs` uses only Node built-ins and serves `src/` on `localhost`.
- Playwright starts `scripts/serve.mjs` through its `webServer` setting.

### Declared Files
- package.json
- eslint.config.js
- vitest.config.js
- playwright.config.js
- scripts/serve.mjs
- src/index.html
- tests/unit/serve.test.js
- tests/e2e/index.spec.js
- docs/devops.md

Size estimate: 9 files, 350 lines, plus the generated package-lock.json
Size note: nine small configuration files form one tooling setup that cannot merge in parts.

### Tests
- Unit: `serve.mjs` maps URLs to files under `src/` and returns the right content types.
- Unit: `serve.mjs` returns 404 for missing files and rejects path traversal such as `/../package.json`.
- Integration: Playwright loads `index.html` at 390 and 1440 px with HTTP 200 and no console errors.

Completion check: `npm test && npm run lint && npm run test:e2e`
