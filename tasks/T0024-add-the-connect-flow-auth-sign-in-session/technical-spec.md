## Technical Specifications

### Prerequisites Outside This Project
- The Auth sign-in redirect and return flow for this app's origin must be registered with the Auth service.

### Declared Files
- src/js/sync/session.js
- src/js/views/connect.js
- src/js/views/settings.js
- tests/unit/session.test.js
- tests/e2e/connect.spec.js

Size estimate: 5 files, 400 lines

### Tests
- Unit: the session module stores, reads, expires, and deletes the token.
- Unit: an expired token reports "sign in needed" without failing local operations.
- Integration: a mocked Auth redirect returns to `#/connect` signed in; an uninvited user sees the invitation message.
- Integration: disconnecting deletes the token and shows Local only.

Completion check: `npm test && npm run lint && npm run test:e2e`
