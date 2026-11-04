import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../src/', import.meta.url));
const SOURCE = readFileSync(join(ROOT, 'service-worker.js'), 'utf8');

// Files under src/ that the app never loads: the gallery, the worker itself, and the font license.
const NOT_PRECACHED = [/^demo\//, /^service-worker\.js$/, /^fonts\/OFL\.txt$/];

/**
 * List every file under a folder, as web paths relative to src/.
 * @param {string} folder absolute folder
 * @returns {string[]} the relative paths, with forward slashes
 */
function walk(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? walk(path) : [relative(ROOT, path).split(sep).join('/')];
  });
}

/**
 * Read the precache list from the service worker source.
 * @returns {string[]} the entries of the `PRECACHE` array
 */
function precacheList() {
  const body = SOURCE.match(/const PRECACHE = \[([\s\S]*?)\];/)?.[1] ?? '';
  return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

describe('service worker precache', () => {
  it('lists every file the app needs under src/, except the gallery', () => {
    const needed = walk(ROOT).filter((path) => !NOT_PRECACHED.some((rule) => rule.test(path))).sort();
    const listed = precacheList().filter((entry) => entry !== './');
    expect(needed.filter((path) => !listed.includes(path))).toEqual([]);
    expect(listed.filter((path) => !needed.includes(path))).toEqual([]);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('precaches the start URL and names a versioned cache', () => {
    expect(precacheList()).toContain('./');
    expect(SOURCE).toMatch(/const VERSION = '[^']+';/);
    expect(SOURCE).toMatch(/const CACHE = `todos-shell-\$\{VERSION\}`;/);
  });

  it('installs from the network, bypassing the HTTP cache, so a new version never stores stale files', async () => {
    const handlers = {};
    let added = null;
    const context = {
      Request,
      URL,
      Promise,
      self: {
        location: new URL('https://todos.example/'),
        addEventListener: (type, handler) => {
          handlers[type] = handler;
        },
        skipWaiting: async () => {},
        clients: { claim: async () => {} },
      },
      caches: {
        open: async () => ({
          addAll: async (requests) => {
            added = requests;
          },
        }),
        keys: async () => [],
      },
    };
    runInNewContext(SOURCE, context);
    let installed;
    handlers.install({ waitUntil: (promise) => {
      installed = promise;
    } });
    await installed;
    expect(added).toHaveLength(precacheList().length);
    for (const request of added) {
      expect(request).toBeInstanceOf(Request);
      expect(request.cache).toBe('reload');
    }
  });

  it('never fetches another origin', () => {
    expect(SOURCE).not.toMatch(/https?:\/\//);
    expect(SOURCE).toMatch(/url\.origin !== self\.location\.origin/);
  });
});
