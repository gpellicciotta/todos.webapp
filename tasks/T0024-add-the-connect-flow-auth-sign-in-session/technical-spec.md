## Technical Specifications

### Prerequisites Outside This Project
- The Auth sign-in redirect and return flow for this app's origin must be registered with the Auth service.

### Auth Contract
Sources: Auth `docs/web-api.md` and `webapp/js/view/sign-in-view.mjs`, support.js `redirectToAuth`,
the ToDo's `TodosRestController` (`authCallback`, `POST` and `DELETE /api/auth-token`), and `clients/js/src/client.mjs`.
1. Sign in opens `{{auth-url}}/sign-in?app-name=todos&app-redirect-url={{return-url}}&app-logo-url={{logo-url}}`.
2. Auth returns to `{{return-url}}?authorization-code={{code}}`, appending the query by string.
   With `{{return-url}}` = `{{app}}/#/connect`, the code stays in the fragment.
3. `GET {{server}}/api/auth-token/callback?authorization-code={{code}}` validates the code with the app secret.
   It redirects to `{{server}}/sign-in?opc={{opc}}&email={{email}}`; a rejected code returns `401`.
4. `POST {{server}}/api/auth-token` with `Authorization: Basic {{email}}:{{opc}}` returns
   `{"id", "bearer-token", "expiration-time", "user-id", "email"}`.
5. `GET {{server}}/api/users/me` with the bearer token returns the account name and email.
6. `DELETE {{server}}/api/auth-token` with the bearer token ends the session (`204`).

### Decisions
- **[Decided]** `src/js/sync/auth.js` holds the contract above; `session.js` and the screens never build Auth URLs.
- **[Decided]** The return URL is the app's own `#/connect`; the shell strips the code from the address before routing.
- **[Decided]** A returned code is accepted only after a sign-in started on this device within 15 minutes.
  This stops a crafted link from connecting the device to someone else's account.
- **[Decided]** The session lives in `localStorage` as `todos.session`: token, expiry, account, and server.
- **[Decided]** An expired token is dropped, but the account stays; the state becomes Sign in needed (`CON-13`).
- **[Decided]** A `403` from the exchange means no invitation (`CON-3`); other failures show a retryable error.
- **[Decided]** Disconnect deletes the token first, then asks the server to end the session, ignoring failures.
- **[Decided]** Disconnect takes a `sync` hook (`pendingCount`, `syncNow`); without it, nothing is pending.
- **[Decided]** The sync indicator keeps Local only; T0027 drives its states once sync exists.
- **[Decided]** The service worker also skips same-origin `/api/` requests, for a server on the app's origin.

### Open Points
- **[Feedback Needed]** ToDo's sends CORS headers only in test mode; the app origin needs them in production.
- **[Feedback Needed]** The callback answers with a redirect to its own `/sign-in`; a JSON answer would suit a cross-origin app.
- **[Feedback Needed]** The callback turns Auth's `403` (no access grant) into `401`, hiding the invitation case.
- **[Feedback Needed]** Auth must accept this app's origin as `app-redirect-url` for the `todos` application.

### Declared Files
- src/js/sync/auth.js
- src/js/sync/session.js
- src/js/views/connect.js
- src/js/views/settings.js
- src/js/app.js
- src/service-worker.js
- tests/unit/session.test.js
- tests/e2e/connect.spec.js
- tests/e2e/bin-settings.spec.js
- docs/specs/ui-design.md
- docs/devops.md

Size estimate: 5 files, 400 lines

Mechanical command: `node scripts/check-sw-version.mjs --update` regenerates `scripts/sw-precache-hashes.json`.

### Tests
- Unit: the session module stores, reads, expires, and deletes the token.
- Unit: an expired token reports "sign in needed" without failing local operations.
- Unit: the Auth adapter builds the sign-in URL, reads the return, and maps `403` to not invited.
- Integration: a mocked Auth redirect returns to `#/connect` signed in; an uninvited user sees the invitation message.
- Integration: disconnecting deletes the token and shows Local only.
- Integration: local mode makes no network request outside the app origin.

Completion check: `npm test && npm run lint && npm run test:e2e`
