import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../src/', import.meta.url));
const SOURCE = readFileSync(join(ROOT, 'service-worker.js'), 'utf8');

// Files under src/ that the app never loads: the gallery and the worker itself.
// The vendored design system counts only where the app loads it: style.css and the app modules, through loadedVendorFiles().
const NOT_PRECACHED = [/^demo\//, /^service-worker\.js$/, /^vendor\//];

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

/**
 * Follow the references from css/style.css and the app modules to the vendored files the app loads:
 * CSS `@import` and `url()`, module imports, and page-relative `vendor/` paths in app code, such as the look sprite.
 * @returns {string[]} web paths relative to src/, under vendor/
 */
function loadedVendorFiles() {
  const seen = new Set();
  const visit = (path) => {
    if (seen.has(path)) {
      return;
    }
    seen.add(path);
    const text = /\.(css|js)$/.test(path) ? readFileSync(join(ROOT, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') : '';
    const pattern = path.endsWith('.css') ? /url\(\s*['"]?([^'")]+)['"]?\s*\)/g : /^\s*(?:import|export)\b[^'"]*from\s+'([^']+)'/gm;
    for (const match of text.matchAll(pattern)) {
      visit(posix.normalize(posix.join(posix.dirname(path), match[1])));
    }
    if (path.endsWith('.js') && !path.startsWith('vendor/')) {
      for (const match of text.matchAll(/'(vendor\/design\/[^']+)'/g)) {
        visit(match[1]);
      }
    }
  };
  visit('css/style.css');
  walk(join(ROOT, 'js')).forEach(visit);
  return [...seen].filter((path) => path.startsWith('vendor/')).sort();
}

describe('service worker precache', () => {
  it('finds the vendored base, neutral look, and font that style.css loads', () => {
    expect(loadedVendorFiles()).toEqual(expect.arrayContaining([
      'vendor/design/css/base.css',
      'vendor/design/looks/neutral/look.css',
      'vendor/design/looks/neutral/fonts/InterVariable.woff2',
    ]));
  });

  it('lists every file the app needs under src/, except the gallery', () => {
    const needed = [...walk(ROOT).filter((path) => !NOT_PRECACHED.some((rule) => rule.test(path))), ...loadedVendorFiles()].sort();
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
    const added = [];
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
        open: async () => ({ put: async () => {} }),
        keys: async () => [],
      },
      fetch: async (request) => {
        added.push(request);
        return new Response('ok', { headers: { 'content-type': 'text/plain' } });
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
