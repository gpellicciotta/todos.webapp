#!/usr/bin/env node
/**
 * Static development server for the web app.
 *
 * Serves the files under a root folder, `src/` by default, on localhost with caching disabled.
 * It uses Node.js built-ins only, so it runs right after cloning without `npm install`.
 *
 * Usage: node scripts/serve.mjs [--port <port>] [--host <host>] [--root <folder>]
 *                            [--pid-file <file>] [--stop-file <file>]
 */

import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const DEFAULT_ROOT = fileURLToPath(new URL('../src/', import.meta.url));

const USAGE = `Usage: node scripts/serve.mjs [options]

Serve the web app's static files on localhost, with caching disabled.

Options:
  --port <port>       port to listen on (default: 8080; 0 picks a free port)
  --host <host>       host to bind (default: 127.0.0.1)
  --root <folder>     folder to serve (default: src)
  --pid-file <file>   write the process ID here while serving, and remove it on exit
  --stop-file <file>  exit cleanly once this file exists, and remove it (used by devops.py server stop)
  -h, --help          show this help message and exit`;

/**
 * Return the Content-Type header value for a file name.
 * @param {string} name file name or path
 * @returns {string} the media type, `application/octet-stream` when unknown
 */
export function contentType(name) {
  return CONTENT_TYPES[extname(name).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Map a request URL to a file under the root folder.
 * @param {string} root absolute folder to serve
 * @param {string} url request URL path, with an optional query string
 * @returns {Promise<{status: number, file?: string}>} 200 with the file, or 400, 403, or 404
 */
export async function resolveRequest(root, url) {
  const base = resolve(root);
  let path;
  try {
    path = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  }
  catch {
    return { status: 400 };
  }
  if (path.includes('\0')) {
    return { status: 400 };
  }
  const target = resolve(base, `.${path.startsWith('/') ? path : `/${path}`}`);
  if (target !== base && !target.startsWith(base + sep)) {
    return { status: 403 };
  }
  let file = target;
  try {
    let info = await stat(file);
    if (info.isDirectory()) {
      file = join(file, 'index.html');
      info = await stat(file);
    }
    if (!info.isFile()) {
      return { status: 404 };
    }
  }
  catch {
    return { status: 404 };
  }
  return { status: 200, file };
}

/**
 * Start the server and resolve once it listens.
 * @param {{root?: string, port?: number, host?: string}} options server options
 * @returns {Promise<import('node:http').Server>} the listening server
 */
export function startServer({ root = DEFAULT_ROOT, port = 8080, host = '127.0.0.1' } = {}) {
  const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD' }).end();
      return;
    }
    const result = await resolveRequest(root, request.url ?? '/');
    if (result.status !== 200) {
      response.writeHead(result.status, { 'content-type': 'text/plain; charset=utf-8' }).end(`${result.status}\n`);
      return;
    }
    response.writeHead(200, { 'content-type': contentType(result.file), 'cache-control': 'no-store' });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(result.file).pipe(response);
  });
  return new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, host, () => resolveListen(server));
  });
}

/**
 * Poll for a stop file and resolve once it exists, after deleting it.
 * @param {string} file the stop file path
 * @param {number} [intervalMs] polling interval in milliseconds
 * @returns {Promise<void>} settles when the file appeared
 */
export function waitForStopFile(file, intervalMs = 200) {
  return new Promise((resolveWait) => {
    const timer = setInterval(async () => {
      try {
        await stat(file);
      }
      catch {
        return;
      }
      clearInterval(timer);
      await rm(file, { force: true });
      resolveWait();
    }, intervalMs);
  });
}

/**
 * Run the server from the command line.
 * @param {string[]} argv command-line arguments after the script name
 * @returns {Promise<number>} the exit code, or a never-settling wait while serving
 */
async function main(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        port: { type: 'string', default: '8080' },
        host: { type: 'string', default: '127.0.0.1' },
        root: { type: 'string' },
        'pid-file': { type: 'string' },
        'stop-file': { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  }
  catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    return 2;
  }
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`Invalid port: ${values.port}\n\n${USAGE}`);
    return 2;
  }
  const root = values.root ? resolve(values.root) : DEFAULT_ROOT;
  const server = await startServer({ root, port, host: values.host });
  const { address, port: actual } = server.address();
  console.log(`Serving ${root} at http://${address}:${actual}/`);
  const pidFile = values['pid-file'] ? resolve(values['pid-file']) : null;
  if (pidFile) {
    await mkdir(dirname(pidFile), { recursive: true });
    await writeFile(pidFile, `${process.pid}
`);
  }
  const stopFile = values['stop-file'] ? resolve(values['stop-file']) : null;
  const stopped = stopFile ? waitForStopFile(stopFile) : new Promise(() => {});
  const interrupted = new Promise((resolveSignal) => {
    process.once('SIGINT', resolveSignal);
    process.once('SIGTERM', resolveSignal);
  });
  await Promise.race([stopped, interrupted]);
  if (pidFile) {
    await rm(pidFile, { force: true });
  }
  server.closeAllConnections();
  await new Promise((resolveClose) => server.close(resolveClose));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
