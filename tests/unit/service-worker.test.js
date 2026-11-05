import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(fileURLToPath(new URL('../../src/service-worker.js', import.meta.url)), 'utf8');

/**
 * Load the service worker in a sandbox and send it one request.
 * @param {string} scope the worker URL, which decides the base path
 * @param {string} url the request URL
 * @param {{mode?: string, method?: string, cached?: string[]}} [options] request mode, method, and cached URLs
 * @returns {Promise<{handled: boolean, body: string|null, fetched: string[], stored: string[]}>} what the worker did
 */
async function send(scope, url, { mode = 'navigate', method = 'GET', cached = ['./'] } = {}) {
  const handlers = {};
  const fetched = [];
  const stored = [];
  const cache = {
    match: async (request) => {
      const key = typeof request === 'string' ? request : request.url;
      return cached.includes(key) || (key === url && cached.includes(url)) ? `cached:${key}` : undefined;
    },
    put: async (request) => {
      stored.push(request.url);
    },
  };
  const context = {
    URL,
    Promise,
    Request,
    self: {
      location: new URL(scope),
      addEventListener: (type, handler) => {
        handlers[type] = handler;
      },
    },
    caches: { open: async () => cache },
    fetch: async (request) => {
      fetched.push(request.url);
      throw new TypeError('offline');
    },
  };
  runInNewContext(SOURCE, context);
  let answer = null;
  const request = { url, method, mode };
  handlers.fetch({ request, respondWith: (promise) => {
    answer = promise;
  } });
  const body = answer ? await answer.catch(() => 'rejected') : null;
  return { handled: answer !== null, body, fetched, stored };
}

describe.each([
  ['the site root', 'https://todos.example/service-worker.js', 'https://todos.example/'],
  ['the Pages subpath', 'https://todos.example/todos.webapp/service-worker.js', 'https://todos.example/todos.webapp/'],
])('service worker at %s', (_name, scope, base) => {
  it.each(['admin', 'admin/', 'admin/users', 'api', 'api/', 'api/tasks'])('leaves %s alone, offline', async (path) => {
    for (const mode of ['navigate', 'cors']) {
      const result = await send(scope, `${base}${path}`, { mode });
      expect(result.handled).toBe(false);
      expect(result.stored).toEqual([]);
    }
  });

  it('still serves the app shell for a navigation, offline', async () => {
    const result = await send(scope, `${base}index.html`, { cached: ['./'] });
    expect(result.handled).toBe(true);
    expect(result.body).toBe('cached:./');
  });

  it('does not treat names that merely start with admin or api as reserved', async () => {
    const result = await send(scope, `${base}administrators`, { cached: ['./'] });
    expect(result.handled).toBe(true);
  });
});
