/**
 * Service worker: precaches the app shell so the app starts and runs offline (`TEC-1`).
 *
 * Install caches every file of PRECACHE in a cache named after VERSION; activate deletes older caches.
 * A new worker waits after it installs; the page's Update toast sends `{type: 'skip-waiting'}` to activate it,
 * so open pages never mix old and new files (`TEC-19`). The first install has no page to protect and just claims it.
 * Install rejects a non-OK answer, and an HTML answer for any file but the start page: the server answers an unknown
 * path with the start page and status 200, and caching that as a stylesheet leaves the app unstyled until the next VERSION.
 * Same-origin GET requests are served cache first, except that cached HTML never answers a non-navigation request
 * for any file but the start page; page navigations fall back to the cached start page.
 * Other origins and the server paths `/admin` and `/api` are never fetched or cached here (`LOC-3`):
 * a navigation to `/admin` reaches the server and never falls back to the app shell.
 * Bump VERSION with every change to a precached file, and keep PRECACHE complete:
 * tests/unit/precache.test.js fails when a file under src/, outside src/demo/, is missing.
 */

const VERSION = '2026-11-09.3';
const CACHE = `todos-shell-${VERSION}`;
const PREFIX = 'todos-shell-';
const HTML_ENTRIES = ['./', 'index.html'];

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/fonts.css',
  'css/tokens.css',
  'css/controls.css',
  'css/app-components.css',
  'css/app-chrome.css',
  'css/app-shell.css',
  'css/views.css',
  'fonts/InterVariable.woff2',
  'img/icons.svg',
  'img/app-icon.svg',
  'img/app-icon-192.png',
  'img/app-icon-512.png',
  'js/app.js',
  'js/core/backup.js',
  'js/core/list-counts.js',
  'js/core/list-find.js',
  'js/core/list-order.js',
  'js/core/list-sort.js',
  'js/core/overdue.js',
  'js/core/permissions.js',
  'js/core/preferences.js',
  'js/core/query.js',
  'js/lib/fractional-index.js',
  'js/lib/uuid7.js',
  'js/store/bin.js',
  'js/store/bulk.js',
  'js/store/db.js',
  'js/store/idb.js',
  'js/store/lists.js',
  'js/store/notes.js',
  'js/store/tasks.js',
  'js/sync/adopt.js',
  'js/sync/api.js',
  'js/sync/auth.js',
  'js/sync/engine.js',
  'js/sync/inbox.js',
  'js/sync/merge.js',
  'js/sync/pull.js',
  'js/sync/push.js',
  'js/sync/queue.js',
  'js/sync/session.js',
  'js/sync/sync-log.js',
  'js/ui/dialog.js',
  'js/ui/inbox.js',
  'js/ui/layout.js',
  'js/ui/live-region.js',
  'js/ui/menu.js',
  'js/ui/popover.js',
  'js/ui/router.js',
  'js/ui/sw-update.js',
  'js/ui/toast.js',
  'js/ui/user-menu.js',
  'js/views/add-bar.js',
  'js/views/all-tasks.js',
  'js/views/connect.js',
  'js/views/editor-panel.js',
  'js/views/import-dialog.js',
  'js/views/list-actions.js',
  'js/views/list-editor.js',
  'js/views/list.js',
  'js/views/lists.js',
  'js/views/notes.js',
  'js/views/recycle-bin.js',
  'js/views/reorder.js',
  'js/views/settings.js',
  'js/views/sharing.js',
  'js/views/sync-indicator.js',
  'js/views/sync-log.js',
  'js/views/task-editor.js',
  'js/views/task-list.js',
  'js/views/view-controls.js',
  'js/version.js',
];

/**
 * Tell whether a URL belongs to the server, not the app: `/admin` and `/api`, at the site root or under the worker's base path.
 * @param {URL} url the request URL
 * @returns {boolean} true when the worker must leave the request alone
 */
function isServerPath(url) {
  const base = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(base)) {
    return false;
  }
  const [first] = url.pathname.slice(base.length).split('/');
  return first === 'admin' || first === 'api';
}

/**
 * Tell whether a response is an HTML page.
 * @param {Response} response the response to inspect
 * @returns {boolean} true when its content type is text/html
 */
function isHtml(response) {
  return (response.headers?.get('content-type') ?? '').startsWith('text/html');
}

/**
 * Fetch one precache entry and store it, or throw when the server answered wrongly.
 * @param {Cache} cache the cache to fill
 * @param {string} path the entry, relative to the worker
 * @returns {Promise<void>} resolves once the entry is stored
 */
async function precacheEntry(cache, path) {
  // `cache: 'reload'` skips the HTTP cache, so a new VERSION never stores files cached before the deploy.
  const request = new Request(new URL(path, self.location.href), { cache: 'reload' });
  const response = await fetch(request);
  if (!response.ok) {
    throw new Error(`Precache failed: ${path} answered ${response.status}`);
  }
  if (!HTML_ENTRIES.includes(path) && isHtml(response)) {
    throw new Error(`Precache failed: ${path} answered HTML`);
  }
  await cache.put(request, response);
}

/**
 * Tell whether a URL is one of the HTML entries of the app shell.
 * @param {URL} url the request URL
 * @returns {boolean} true for the start URL and index.html
 */
function isShellPage(url) {
  return HTML_ENTRIES.some((path) => new URL(path, self.location.href).href === url.href);
}

self.addEventListener('install', (event) => {
  // One bad entry fails the install and drops the partial cache, so the next visit starts clean.
  event.waitUntil(caches.open(CACHE)
    .then((cache) => Promise.all(PRECACHE.map((path) => precacheEntry(cache, path))))
    .catch(async (error) => {
      await caches.delete(CACHE);
      throw error;
    }));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'skip-waiting') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || isServerPath(url)) {
    return;
  }
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (cached && !(request.mode !== 'navigate' && isHtml(cached) && !isShellPage(url))) {
      return cached;
    }
    try {
      return await fetch(request);
    }
    catch (error) {
      const start = request.mode === 'navigate' ? await cache.match('./') : null;
      if (start) {
        return start;
      }
      throw error;
    }
  }));
});
