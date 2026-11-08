# T0079 Technical Specification

### Design Decisions
- **[Decided]** Contract from auth T0206: the client sends `app-state`; Auth returns it as `state` before `authorization-code` or `error`.
- **[Decided]** The state is 16 random bytes in base64url, from `crypto.getRandomValues`, stored in the pending sign-in record.
- **[Decided]** `session.complete(code, state)` rejects a missing or different state with `AuthError('state-mismatch')` before any request.
- **[Decided]** A return uses up the pending sign-in, matching or not, so a state is never accepted twice.
- **[Decided]** A return without state is rejected. Auth T0215 still has to forward state on its password, OTP, and cookie redirects.
- **[Decided]** Error returns are not state-checked; they only end the pending sign-in, as before.

### Declared Files
- src/js/sync/auth.js
- src/js/sync/session.js
- src/js/views/connect.js
- src/service-worker.js
- tests/unit/session.test.js
- tests/e2e/connect.spec.js
- tests/contract/sync.contract.test.js
- docs/devops.md
- CHANGELOG.md

Size estimate: 9 files, 120 lines

### Tests
- Unit: `signInUrl` adds `app-state` only with a state; `readReturn` reads `state`; `start` sends a fresh random state each time.
- Unit: `complete` rejects a missing, empty, or different state with `state-mismatch`, sends no request, and uses up the sign-in.
- Unit: a captured return with the matching state signs in.
- Integration: Playwright run where the Auth mock returns a forged state shows "Sign-in did not finish." and makes no request.
- Integration: the contract test signs in through the real server routes with the state from the sign-in URL.

Completion check: `npm test`, `npm run lint`, `npx playwright test tests/e2e/connect.spec.js`, and `npm run test:contract`.
