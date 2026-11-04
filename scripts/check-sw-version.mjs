#!/usr/bin/env node
/**
 * Service worker VERSION check: fails when a precached file changed but `VERSION` did not.
 *
 * It hashes every file of the worker's PRECACHE list and compares them with a committed manifest.
 * The manifest records the VERSION and the file hashes it was written for.
 * Text files hash with LF line endings, so Windows and CI checkouts agree; binary files hash byte exact.
 * It uses Node.js built-ins only.
 *
 * Usage: node scripts/check-sw-version.mjs [--update] [--root <folder>] [--manifest <file>]
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const DEFAULT_ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const DEFAULT_MANIFEST = fileURLToPath(new URL('sw-precache-hashes.json', import.meta.url));
const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest', '.svg', '.txt']);

const USAGE = `Usage: node scripts/check-sw-version.mjs [options]

Check that the service worker VERSION changes whenever a precached file changes.

Options:
  --update           rewrite the manifest after a VERSION bump
  --root <folder>    web root holding service-worker.js (default: src)
  --manifest <file>  hash manifest (default: scripts/sw-precache-hashes.json)
  -h, --help         show this help message and exit

Exit codes: 0 up to date, 1 VERSION or manifest out of date, 2 usage or read error.`;

/**
 * Read VERSION and the PRECACHE entries from the service worker source.
 * @param {string} source service worker source
 * @returns {{version: string, precache: string[]}} the version and the precache list
 */
export function parseWorker(source) {
  const version = source.match(/const VERSION = '([^']+)';/)?.[1];
  if (!version) {
    throw new Error('service-worker.js has no `const VERSION = \'...\';` line');
  }
  const body = source.match(/const PRECACHE = \[([\s\S]*?)\];/)?.[1];
  if (body === undefined) {
    throw new Error('service-worker.js has no `const PRECACHE = [...];` list');
  }
  return { version, precache: [...body.matchAll(/'([^']+)'/g)].map((match) => match[1]) };
}

/**
 * Hash every precached file, skipping the start URL `./`, which serves index.html.
 * @param {string} root absolute web root
 * @param {string[]} precache the precache entries, relative to the root
 * @returns {Promise<Record<string, string>>} SHA-256 hex digests by entry, in precache order
 */
export async function hashPrecache(root, precache) {
  const files = {};
  for (const entry of precache.filter((item) => item !== './')) {
    let bytes = await readFile(join(root, entry));
    if (TEXT.has(extname(entry).toLowerCase())) {
      bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    }
    files[entry] = createHash('sha256').update(bytes).digest('hex');
  }
  return files;
}

/**
 * Compare the current worker state with the manifest.
 * @param {{version: string, files: Record<string, string>}} current VERSION and hashes now
 * @param {{version: string, files: Record<string, string>}} manifest VERSION and hashes committed
 * @returns {{ok: boolean, bumped: boolean, changed: string[]}} the verdict, whether VERSION moved, and the changed entries
 */
export function checkVersion(current, manifest) {
  const entries = [...new Set([...Object.keys(manifest.files), ...Object.keys(current.files)])].sort();
  const changed = entries.filter((entry) => current.files[entry] !== manifest.files[entry]);
  const bumped = current.version !== manifest.version;
  return { ok: !bumped && changed.length === 0, bumped, changed };
}

/**
 * Run the check, or rewrite the manifest with `--update`.
 * @param {string[]} argv command-line arguments, without the node and script paths
 * @param {string[]} out collected output lines
 * @returns {Promise<number>} the exit code
 */
export async function run(argv, out) {
  let options;
  try {
    ({ values: options } = parseArgs({
      args: argv,
      options: {
        update: { type: 'boolean', default: false },
        root: { type: 'string', default: DEFAULT_ROOT },
        manifest: { type: 'string', default: DEFAULT_MANIFEST },
        help: { type: 'boolean', short: 'h', default: false },
      },
    }));
  }
  catch (error) {
    out.push(`ERROR: ${error.message}`, USAGE);
    return 2;
  }
  if (options.help) {
    out.push(USAGE);
    return 0;
  }
  let current;
  try {
    const { version, precache } = parseWorker(await readFile(join(options.root, 'service-worker.js'), 'utf8'));
    current = { version, files: await hashPrecache(options.root, precache) };
  }
  catch (error) {
    out.push(`ERROR: ${error.message}`);
    return 2;
  }
  let manifest = null;
  try {
    manifest = JSON.parse(await readFile(options.manifest, 'utf8'));
  }
  catch (error) {
    if (error.code !== 'ENOENT') {
      out.push(`ERROR: cannot read ${options.manifest}: ${error.message}`);
      return 2;
    }
  }
  const result = manifest ? checkVersion(current, manifest) : null;
  if (options.update) {
    if (result && !result.bumped && !result.ok) {
      out.push(`ERROR: precached files changed but VERSION is still ${current.version}: ${result.changed.join(', ')}`,
        'Bump VERSION in service-worker.js first, then run --update again.');
      return 1;
    }
    await writeFile(options.manifest, `${JSON.stringify(current, null, 2)}\n`);
    out.push(`OK: wrote ${Object.keys(current.files).length} hashes for VERSION ${current.version} to ${options.manifest}`);
    return 0;
  }
  if (!result) {
    out.push(`ERROR: ${options.manifest} does not exist; create it with --update.`);
    return 1;
  }
  if (result.ok) {
    out.push(`OK: ${Object.keys(current.files).length} precached files match VERSION ${current.version}.`);
    return 0;
  }
  if (!result.bumped) {
    out.push(`ERROR: precached files changed but VERSION is still ${current.version}:`,
      ...result.changed.map((entry) => `  ${entry}`),
      'Bump VERSION in service-worker.js, then run: node scripts/check-sw-version.mjs --update');
    return 1;
  }
  out.push(`ERROR: VERSION moved from ${manifest.version} to ${current.version} but the manifest was not updated.`,
    'Run: node scripts/check-sw-version.mjs --update, and commit the manifest.');
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = [];
  const code = await run(process.argv.slice(2), out);
  (code === 0 ? process.stdout : process.stderr).write(`${out.join('\n')}\n`);
  process.exitCode = code;
}
