import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

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

/**
 * Load the service worker in a sandbox that records its lifecycle calls.
 * @returns {{handlers: object, skipWaiting: import('vitest').Mock, claim: import('vitest').Mock, added: string[]}} the handlers and spies
 */
function loadWorker() {
  const handlers = {};
  const added = [];
  const skipWaiting = vi.fn(() => Promise.resolve());
  const claim = vi.fn(() => Promise.resolve());
  const context = {
    URL,
    Promise,
    Request,
    self: {
      location: new URL('https://todos.example/service-worker.js'),
      addEventListener: (type, handler) => {
        handlers[type] = handler;
      },
      skipWaiting,
      clients: { claim },
    },
    caches: {
      open: async () => ({ put: async (request) => added.push(request.url) }),
      keys: async () => [],
    },
    fetch: async () => new Response('ok', { headers: { 'content-type': 'text/plain' } }),
  };
  runInNewContext(SOURCE, context);
  return { handlers, skipWaiting, claim, added };
}

describe('service worker update protocol', () => {
  it('precaches on install and waits, without calling skipWaiting', async () => {
    const { handlers, skipWaiting, added } = loadWorker();
    let work = null;
    handlers.install({ waitUntil: (promise) => {
      work = promise;
    } });
    await work;
    expect(added.length).toBeGreaterThan(10);
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  it('calls skipWaiting on the skip-waiting message', () => {
    const { handlers, skipWaiting } = loadWorker();
    handlers.message({ data: { type: 'skip-waiting' } });
    expect(skipWaiting).toHaveBeenCalledTimes(1);
  });

  it.each([[{ type: 'other' }], ['skip-waiting'], [null], [undefined]])('ignores the message %j', (data) => {
    const { handlers, skipWaiting } = loadWorker();
    handlers.message({ data });
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  it('claims the open pages when it activates', async () => {
    const { handlers, claim } = loadWorker();
    let work = null;
    handlers.activate({ waitUntil: (promise) => {
      work = promise;
    } });
    await work;
    expect(claim).toHaveBeenCalledTimes(1);
  });
});

/**
 * Run the install handler against a server that answers each URL with the given response.
 * @param {(url: string) => Response} answer the server
 * @returns {Promise<{error: Error|null, stored: string[], deleted: string[]}>} the install outcome, the URLs stored, the caches deleted
 */
async function install(answer) {
  const handlers = {};
  const stored = [];
  const deleted = [];
  const context = {
    URL,
    Promise,
    Request,
    self: {
      location: new URL('https://todos.example/service-worker.js'),
      addEventListener: (type, handler) => {
        handlers[type] = handler;
      },
    },
    caches: {
      open: async () => ({ put: async (request) => stored.push(request.url) }),
      delete: async (name) => deleted.push(name),
    },
    fetch: async (request) => answer(request.url),
  };
  runInNewContext(SOURCE, context);
  let work = null;
  handlers.install({ waitUntil: (promise) => {
    work = promise;
  } });
  const error = await work.then(() => null, (reason) => reason);
  return { error, stored, deleted };
}

const asset = (url) => new Response('body', { headers: { 'content-type': url.endsWith('.css') ? 'text/css' : 'text/plain' } });
const html = () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } });

describe('service worker install validation', () => {
  it('stores every file when the server answers correctly, HTML for the start page included', async () => {
    const { error, stored } = await install((url) => (url.endsWith('/') || url.endsWith('index.html') ? html() : asset(url)));
    expect(error).toBeNull();
    expect(stored.length).toBeGreaterThan(10);
  });

  it('fails when a stylesheet comes back as HTML with status 200', async () => {
    const { error } = await install((url) => (url.endsWith('css/views.css') ? html() : asset(url)));
    expect(error?.message).toContain('css/views.css');
  });

  it('fails when a script comes back as HTML with status 200', async () => {
    const { error } = await install((url) => (url.endsWith('js/app.js') ? html() : asset(url)));
    expect(error?.message).toContain('js/app.js');
  });

  it('deletes the partial cache when the install fails', async () => {
    const { deleted } = await install((url) => (url.endsWith('js/app.js') ? html() : asset(url)));
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toMatch(/^todos-shell-/);
  });

  it('fails when the start page answers 500', async () => {
    const { error } = await install((url) => (url.endsWith('/') ? new Response('', { status: 500 }) : asset(url)));
    expect(error?.message).toContain('500');
  });

  it('fails when a file answers 404', async () => {
    const { error } = await install((url) => (url.endsWith('img/icons.svg') ? new Response('', { status: 404 }) : asset(url)));
    expect(error?.message).toContain('img/icons.svg');
  });
});

describe('service worker cached HTML', () => {
  const cachedHtml = () => ({ headers: new Headers({ 'content-type': 'text/html' }) });

  /**
   * Send a request for which the cache holds an HTML response, and a good network copy.
   * @param {string} mode the request mode
   * @param {object} cachedResponse the cached response
   * @param {string} [url] the request URL
   * @returns {Promise<unknown>} what the worker answered
   */
  async function answerFrom(mode, cachedResponse, url = 'https://todos.example/css/style.css') {
    const handlers = {};
    const context = {
      URL,
      Promise,
      Request,
      self: {
        location: new URL('https://todos.example/service-worker.js'),
        addEventListener: (type, handler) => {
          handlers[type] = handler;
        },
      },
      caches: { open: async () => ({ match: async () => cachedResponse }) },
      fetch: async () => 'network',
    };
    runInNewContext(SOURCE, context);
    let answer = null;
    handlers.fetch({ request: { url, method: 'GET', mode }, respondWith: (promise) => {
      answer = promise;
    } });
    return answer;
  }

  it.each(['no-cors', 'cors', 'same-origin'])('ignores cached HTML for a %s request and uses the network', async (mode) => {
    expect(await answerFrom(mode, cachedHtml())).toBe('network');
  });

  it.each(['https://todos.example/', 'https://todos.example/index.html'])('serves cached HTML for a non-navigation request for %s', async (url) => {
    const cached = cachedHtml();
    expect(await answerFrom('cors', cached, url)).toBe(cached);
  });

  it('serves cached HTML for a navigation', async () => {
    const cached = cachedHtml();
    expect(await answerFrom('navigate', cached)).toBe(cached);
  });

  it('serves a cached stylesheet for a stylesheet request', async () => {
    const cached = { headers: new Headers({ 'content-type': 'text/css' }) };
    expect(await answerFrom('no-cors', cached)).toBe(cached);
  });
});
