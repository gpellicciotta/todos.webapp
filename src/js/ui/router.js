/**
 * Hash router: the routes of docs/specs/ui-design.md, `hashchange` handling, and per-view memory.
 *
 * Routes live in the URL hash, such as `#/lists/{{list-id}}`, since GitHub Pages has no route rewrites.
 * Each route names its view, the screen in the main column, and its editor, the panel beside it.
 * Editor routes share the view key of their view, so opening an editor keeps the view and its scroll.
 * Each view key keeps its scroll position and a memory object for filters and sort (`TV-12`).
 */

export const DEFAULT_HASH = '#/tasks';

/** Route patterns, in match order; `:name` segments are identifiers. */
const ROUTES = [
  { name: 'tasks', path: 'tasks', view: 'tasks', editor: null },
  { name: 'view-options', path: 'tasks/view-options', view: 'tasks', editor: 'view-options' },
  { name: 'task', path: 'tasks/:taskId', view: 'tasks', editor: 'task' },
  { name: 'lists', path: 'lists', view: 'lists', editor: null },
  { name: 'list-new', path: 'lists/new', view: 'lists', editor: 'list' },
  { name: 'list', path: 'lists/:listId', view: 'list', editor: null },
  { name: 'list-edit', path: 'lists/:listId/edit', view: 'list', editor: 'list' },
  { name: 'list-view-options', path: 'lists/:listId/view-options', view: 'list', editor: 'view-options' },
  { name: 'list-task', path: 'lists/:listId/tasks/:taskId', view: 'list', editor: 'task' },
  { name: 'bin', path: 'bin', view: 'bin', editor: null },
  { name: 'settings', path: 'settings', view: 'settings', editor: null },
  { name: 'sync-log', path: 'settings/sync-log', view: 'sync-log', editor: null },
  { name: 'connect', path: 'connect', view: 'connect', editor: null },
].map((route) => ({ ...route, segments: route.path.split('/') }));

/**
 * Match path segments against a route pattern.
 * @param {string[]} pattern the pattern segments
 * @param {string[]} segments the decoded path segments
 * @returns {object|null} the identifiers by name, or null when the segments do not match
 */
function match(pattern, segments) {
  if (pattern.length !== segments.length) {
    return null;
  }
  const params = {};
  for (const [index, part] of pattern.entries()) {
    if (part.startsWith(':')) {
      if (!segments[index] || segments[index] === 'new') {
        return null;
      }
      params[part.slice(1)] = segments[index];
    }
    else if (part !== segments[index]) {
      return null;
    }
  }
  return params;
}

/**
 * Parse a URL hash into a route.
 * @param {string} hash the hash, such as `#/lists/{{list-id}}/edit`
 * @returns {{name: string, params: object, view: string, editor: string|null, viewKey: string, hash: string}|null}
 *   the route, or null for an unknown route
 */
export function parseRoute(hash) {
  if (!hash.startsWith('#/')) {
    return null;
  }
  let segments;
  try {
    segments = hash.slice(2).split('/').map(decodeURIComponent);
  }
  catch {
    return null;
  }
  for (const route of ROUTES) {
    const params = match(route.segments, segments);
    if (params) {
      const viewKey = params.listId ? `${route.view}/${params.listId}` : route.view;
      return { name: route.name, params, view: route.view, editor: route.editor, viewKey, hash };
    }
  }
  return null;
}

/**
 * Format a route as a URL hash.
 * @param {string} name the route name, such as `list-edit`
 * @param {object} [params] the identifiers, such as `{listId}`
 * @returns {string} the hash
 */
export function formatRoute(name, params = {}) {
  const route = ROUTES.find((candidate) => candidate.name === name);
  if (!route) {
    throw new Error(`Unknown route: ${name}`);
  }
  const path = route.segments.map((part) => (part.startsWith(':') ? encodeURIComponent(params[part.slice(1)]) : part));
  return `#/${path.join('/')}`;
}

/**
 * Create a router that renders the route of the URL hash.
 * @param {object} options router options
 * @param {(route: object) => Promise<void>|void} options.onRoute renders a route; scroll restores once it settles
 * @param {(hash: string) => void} [options.onUnknown] called with an unknown hash before All tasks opens
 * @param {{scrollTop: number}} options.scroller the scroll container of the views
 * @param {Window} [options.window] the window, the global one by default
 * @returns {{start: () => void, navigate: (hash: string, settings?: {replace?: boolean}) => void,
 *   current: () => object|null, memory: () => object, idle: () => Promise<void>, destroy: () => void}} the router
 */
export function createRouter({ onRoute, onUnknown = () => {}, scroller, window: win = globalThis.window }) {
  const scrolls = new Map();
  const memories = new Map();
  let current = null;
  let queue = Promise.resolve();

  /**
   * Render the route of the current hash, after saving the scroll position of the view it leaves.
   * @returns {Promise<void>} resolves once the route rendered and its scroll restored
   */
  async function handle() {
    const hash = win.location.hash;
    const route = parseRoute(hash);
    if (!route) {
      if (!['', '#', '#/'].includes(hash)) {
        onUnknown(hash);
      }
      win.location.replace(DEFAULT_HASH);
      return;
    }
    const sameView = current?.viewKey === route.viewKey;
    if (current && !sameView) {
      scrolls.set(current.viewKey, scroller.scrollTop);
    }
    current = route;
    await onRoute(route);
    if (!sameView) {
      scroller.scrollTop = scrolls.get(route.viewKey) ?? 0;
    }
  }

  /** Queue a render, so routes render in order. */
  function onHashChange() {
    queue = queue.then(handle).catch((error) => console.error('Route failed:', error));
  }

  return {
    start() {
      if ('scrollRestoration' in win.history) {
        win.history.scrollRestoration = 'manual';
      }
      win.addEventListener('hashchange', onHashChange);
      onHashChange();
    },
    navigate(hash, { replace = false } = {}) {
      if (replace) {
        win.location.replace(hash);
      }
      else {
        win.location.hash = hash;
      }
    },
    current: () => current,
    memory() {
      const key = current?.viewKey ?? '';
      if (!memories.has(key)) {
        memories.set(key, {});
      }
      return memories.get(key);
    },
    async idle() {
      let last;
      do {
        last = queue;
        await last;
      } while (last !== queue);
    },
    destroy() {
      win.removeEventListener('hashchange', onHashChange);
    },
  };
}
