/**
 * Helper of the contract tests: starts a real todos server on an in-memory database, with a local stand-in for Auth.
 *
 * The server signs users in through the Auth service, so the stand-in grants the codes of a few known accounts.
 * The server is started and stopped with `scripts/devops.py` of the todos checkout named by `TODOS_SERVER_DIR`.
 * Run the suite with `npm run test:contract`; docs/devops.md, Contract Tests, has the details.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createSocketServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const APP_NAME = 'todos';
export const APP_SECRET = 'contract-test-secret';
/** The lowest version the server accepts from `todos.webapp`; the stale client of the `426` test sits below it. */
export const MIN_CLIENT_VERSION = '0.1.0';

/**
 * Name the todos checkout.
 * @param {Record<string, string|undefined>} [env] the environment
 * @returns {string|null} the absolute directory, or null when `TODOS_SERVER_DIR` is unset or blank
 */
export function serverDir(env = process.env) {
  const named = env.TODOS_SERVER_DIR?.trim();
  return named ? resolve(named) : null;
}

/**
 * Build a `devops.py server` command of the todos checkout.
 * @param {string} action `start` or `stop`
 * @param {{dir: string, port: number, envFile: string, python?: string}} options the checkout, the port, and the environment file
 * @returns {{command: string, args: string[], cwd: string}} the command
 */
function devops(action, { dir, port, envFile, python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3') }) {
  const flags = action === 'start' ? ['--memory-db', '--background'] : [];
  return {
    command: python,
    args: [join(dir, 'scripts', 'devops.py'), 'server', action, ...flags, '--port', String(port), '--env-file', envFile],
    cwd: dir,
  };
}

/**
 * Build the command that starts the server on an in-memory database in the background.
 * @param {{dir: string, port: number, envFile: string, python?: string}} options the checkout, the port, and the environment file
 * @returns {{command: string, args: string[], cwd: string}} the command
 */
export const startCommand = (options) => devops('start', options);

/**
 * Build the command that stops the server again.
 * @param {{dir: string, port: number, envFile: string, python?: string}} options the checkout, the port, and the environment file
 * @returns {{command: string, args: string[], cwd: string}} the command
 */
export const stopCommand = (options) => devops('stop', options);

/**
 * Write the environment file of the server: Auth at the stand-in, a minimum client version, no per-IP throttle, and no real secrets.
 * @param {{port: number, authUrl: string}} options the port and the Auth stand-in address
 * @returns {string} the file text
 */
export function environmentText({ port, authUrl }) {
  return [
    'HOSTNAME=127.0.0.1',
    `PORT=${port}`,
    `BASE_URL=http://localhost:${port}`,
    'ENVIRONMENT=test',
    'TODOS_LOG_LEVEL=info',
    'TODOS_LOG_FORMAT_TEMPLATE=${time} [${name}] ${level}',
    'TODOS_LOG_FORMATTER_TYPE=com.pellicciotta.support.logging.spi.TextFormatter',
    'TODOS_FROM_MAIL_ADDRESS=noreply@example.com',
    'TODOS_FEEDBACK_MAIL_ADDRESS=feedback@example.com',
    `TODOS_AUTH_BASE_URL=${authUrl}`,
    `TODOS_AUTH_APP_NAME=${APP_NAME}`,
    `TODOS_AUTH_APP_SECRET=${APP_SECRET}`,
    `TODOS_SYNC_MIN_CLIENT_VERSIONS=todos.webapp=${MIN_CLIENT_VERSION}`,
    'TODOS_THROTTLE_REQUESTS_PER_SECOND=100000',
    '',
  ].join('\n');
}

/**
 * Find a free TCP port on this machine.
 * @returns {Promise<number>} the port
 */
export function freePort() {
  return new Promise((done, fail) => {
    const probe = createSocketServer();
    probe.once('error', fail);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => done(port));
    });
  });
}

/**
 * Start the stand-in for Auth. It grants the code of each account, and answers like the Auth routes the server calls.
 * @param {{code: string, id: number, name: string, email: string, admin?: boolean}[]} accounts the accounts
 * @returns {Promise<{url: string, close: () => Promise<void>}>} the stand-in
 */
export async function startAuthStandIn(accounts) {
  const http = createHttpServer((request, response) => {
    const code = /^Bearer (.+)$/.exec(request.headers.authorization ?? '')?.[1];
    const account = accounts.find((candidate) => candidate.code === code);
    const { pathname, searchParams } = new URL(request.url, 'http://auth.test');
    const reply = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(body));
    };
    const trusted = request.headers['x-app-secret'] === APP_SECRET && searchParams.get('app-name') === APP_NAME;
    if (pathname === '/api/auth-token/validate' && account && trusted) {
      reply(200, { user: { id: account.id, name: account.name, email: account.email }, granted: true });
    }
    else if (pathname === '/api/users/me' && account) {
      reply(200, { id: account.id, name: account.name, email: account.email, realms: account.admin ? ['admin'] : [] });
    }
    else {
      reply(401, { message: 'no grant for this account' });
    }
  });
  await new Promise((done) => http.listen(0, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${http.address().port}`,
    close: () => new Promise((done) => http.close(done)),
  };
}

/**
 * Run a command to its end.
 * @param {{command: string, args: string[], cwd: string}} spec the command
 * @returns {Promise<{code: number|null, output: string}>} the exit code and the combined output
 */
function run({ command, args, cwd }) {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.once('error', fail);
    child.once('close', (code) => done({ code, output }));
  });
}

/**
 * Start a todos server on an in-memory database and a stand-in for Auth.
 * @param {{dir: string, accounts: object[]}} options the todos checkout and the accounts Auth grants
 * @returns {Promise<{url: string, stop: () => Promise<void>}>} the server address, and how to stop everything
 * @throws {Error} with the command output when the server does not start
 */
export async function startStack({ dir, accounts }) {
  const auth = await startAuthStandIn(accounts);
  const port = await freePort();
  const scratch = mkdtempSync(join(tmpdir(), 'todos-contract-'));
  const envFile = join(scratch, 'contract.env');
  writeFileSync(envFile, environmentText({ port, authUrl: auth.url }));
  const options = { dir, port, envFile };
  const stop = async () => {
    try {
      await run(stopCommand(options));
    }
    finally {
      await auth.close();
      rmSync(scratch, { recursive: true, force: true });
    }
  };
  const started = await run(startCommand(options));
  if (started.code !== 0) {
    await stop();
    throw new Error(`devops.py could not start the server (exit ${started.code}):\n${started.output}`);
  }
  return { url: `http://localhost:${port}`, stop };
}
