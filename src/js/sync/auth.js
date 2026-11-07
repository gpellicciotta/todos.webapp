/**
 * Auth adapter: the sign-in contract of the Auth service and the ToDo's service, in one place.
 * Steps, sources, and open points: docs/devops.md, Auth Integration.
 * Auth returns the code to `#/connect`; the ToDo's callback trades it for a one-time passcode (JSON), then a session.
 * The sign-in sends a random `app-state`; Auth returns it as `state`, and the session rejects a mismatch (login CSRF).
 * A `403` from the callback means the account has no invitation for ToDo's (`CON-3`).
 */

export const AUTH_URL = 'https://auth.pellicciotta.com';
export const APP_NAME = 'todos';

/** A sign-in that did not finish, with its reason: `not-invited`, `rejected`, `network`, `not-started`, or `state-mismatch`. */
export class AuthError extends Error {
  /**
   * Create the error.
   * @param {string} reason the reason
   * @param {string} [message] the details, for the console
   */
  constructor(reason, message = reason) {
    super(message);
    this.name = 'AuthError';
    this.reason = reason;
  }
}

/**
 * Build the Auth sign-in URL.
 * @param {string} returnUrl where Auth sends the browser back to
 * @param {{authUrl?: string, logoUrl?: string, state?: string}} [options] the Auth origin, the logo it shows, and the state it returns
 * @returns {string} the URL
 */
export function signInUrl(returnUrl, { authUrl = AUTH_URL, logoUrl, state } = {}) {
  const params = new URLSearchParams({ 'app-name': APP_NAME, 'app-redirect-url': returnUrl });
  if (state) {
    params.set('app-state', state);
  }
  if (logoUrl) {
    params.set('app-logo-url', logoUrl);
  }
  return `${authUrl}/sign-in?${params}`;
}

/**
 * Create a random state: 16 random bytes as 22 base64url characters.
 * @returns {string} the state
 */
export function randomState() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/**
 * Read what Auth appended to the connect route.
 * @param {string} hash the location hash
 * @returns {{code: string, state: string|null}|{error: string, state: string|null}|null} the code or the error with the returned state, or null when this is no return
 */
export function readReturn(hash) {
  if (!hash.startsWith('#/connect?')) {
    return null;
  }
  const params = new URLSearchParams(hash.slice(hash.indexOf('?') + 1));
  const state = params.get('state');
  const code = params.get('authorization-code');
  if (code) {
    return { code, state };
  }
  return { error: params.get('error') ?? 'missing code', state };
}

/**
 * Encode `user:password` for a Basic header, UTF-8 safe.
 * @param {string} user the user
 * @param {string} password the password
 * @returns {string} the header value
 */
function basic(user, password) {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
}

/**
 * Send a request, turning a failed connection into a `network` AuthError.
 * @param {Function} fetch the fetch function
 * @param {string} url the URL
 * @param {object} init the request options
 * @returns {Promise<Response>} the response
 */
async function send(fetch, url, init) {
  try {
    return await fetch(url, { ...init, headers: { Accept: 'application/json', ...init.headers } });
  }
  catch (error) {
    throw new AuthError('network', error?.message);
  }
}

/**
 * Exchange the code Auth returned for a ToDo's session.
 * @param {string} server the server URL, without a trailing slash
 * @param {string} code the authorization code
 * @param {Function} fetch the fetch function
 * @returns {Promise<{token: string, expiry: string|null, user: {name: string|null, email: string}}>} the session
 */
export async function exchangeCode(server, code, fetch) {
  const callback = await send(fetch, `${server}/api/auth-token/callback?authorization-code=${encodeURIComponent(code)}`, {});
  if (callback.status === 403) {
    throw new AuthError('not-invited');
  }
  // The service answers with JSON; an older one redirected to a landing address that carries the one-time passcode.
  const answer = callback.ok ? await callback.json().catch(() => ({})) : {};
  const landing = callback.url ? new URL(callback.url).searchParams : new URLSearchParams();
  const opc = answer['one-time-passcode'] ?? landing.get('opc');
  const email = answer.email ?? landing.get('email');
  if (!opc || !email) {
    throw new AuthError('rejected', `callback answered ${callback.status}`);
  }
  const created = await send(fetch, `${server}/api/auth-token`, { method: 'POST', headers: { Authorization: basic(email, opc) } });
  const body = created.ok ? await created.json() : {};
  const token = body['bearer-token'] ?? body['authorization-code'];
  if (!token) {
    throw new AuthError(created.status === 403 ? 'not-invited' : 'rejected', `session answered ${created.status}`);
  }
  const me = await send(fetch, `${server}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
  const user = me.ok ? await me.json() : {};
  return { token, expiry: body['expiration-time'] ?? body['expiry-time'] ?? null, user: { name: user.name ?? null, email: user.email ?? email } };
}

/**
 * Ask the server to end a session; a failure only means the token expires on its own.
 * @param {string} server the server URL
 * @param {string} token the session token
 * @param {Function} fetch the fetch function
 * @returns {Promise<boolean>} true when the server ended it
 */
export async function endSession(server, token, fetch) {
  try {
    return (await send(fetch, `${server}/api/auth-token`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).ok;
  }
  catch {
    return false;
  }
}
