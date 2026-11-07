import { describe, expect, it, vi } from 'vitest';
import { createRouter, DEFAULT_HASH, formatRoute, parseRoute } from '../../src/js/ui/router.js';

const LIST = '0192f1a2-0000-7000-8000-000000000001';
const TASK = '0192f1a2-0000-7000-8000-000000000002';

const ROUTES = [
  ['#/tasks', 'tasks', {}, 'tasks', null],
  [`#/tasks/${TASK}`, 'task', { taskId: TASK }, 'tasks', 'task'],
  ['#/tasks/view-options', 'view-options', {}, 'tasks', 'view-options'],
  ['#/lists', 'lists', {}, 'lists', null],
  [`#/lists/${LIST}`, 'list', { listId: LIST }, 'list', null],
  [`#/lists/${LIST}/tasks/${TASK}`, 'list-task', { listId: LIST, taskId: TASK }, 'list', 'task'],
  [`#/lists/${LIST}/edit`, 'list-edit', { listId: LIST }, 'list', 'list'],
  [`#/lists/${LIST}/share`, 'list-share', { listId: LIST }, 'list', 'list'],
  [`#/lists/${LIST}/view-options`, 'list-view-options', { listId: LIST }, 'list', 'view-options'],
  ['#/lists/new', 'list-new', {}, 'lists', 'list'],
  ['#/bin', 'bin', {}, 'bin', null],
  ['#/settings', 'settings', {}, 'settings', null],
  ['#/settings/sync-log', 'sync-log', {}, 'sync-log', null],
  ['#/connect', 'connect', {}, 'connect', null],
];

/**
 * Build a window stand-in with a hash history, `hashchange` events, and back and forward.
 * @param {string} [hash] the starting hash
 * @returns {object} the fake window
 */
function fakeWindow(hash = '') {
  const entries = [hash];
  const listeners = new Set();
  let index = 0;
  const fire = () => listeners.forEach((listener) => listener(new Event('hashchange')));
  const go = (delta) => {
    index += delta;
    fire();
  };
  const location = {
    get hash() {
      return entries[index];
    },
    set hash(value) {
      entries.splice(index + 1, Infinity, value);
      go(1);
    },
    replace(value) {
      entries[index] = value;
      fire();
    },
  };
  return {
    location,
    history: { back: () => go(-1), forward: () => go(1), scrollRestoration: 'auto' },
    addEventListener: (type, listener) => listeners.add(listener),
    removeEventListener: (type, listener) => listeners.delete(listener),
  };
}

/**
 * Start a router on a fake window with a fake scroll container.
 * @param {string} hash the starting hash
 * @returns {Promise<{win: object, router: object, scroller: {scrollTop: number}, onRoute: Function, onUnknown: Function}>}
 */
async function startOn(hash) {
  const win = fakeWindow(hash);
  const scroller = { scrollTop: 0 };
  const onRoute = vi.fn(async () => {});
  const onUnknown = vi.fn();
  const router = createRouter({ window: win, scroller, onRoute, onUnknown });
  router.start();
  await router.idle();
  return { win, router, scroller, onRoute, onUnknown };
}

describe('parseRoute and formatRoute', () => {
  it.each(ROUTES)('parses and formats %s', (hash, name, params, view, editor) => {
    const route = parseRoute(hash);
    expect(route).toMatchObject({ name, params, view, editor });
    expect(formatRoute(route.name, route.params)).toBe(hash);
  });

  it('keys the view by its list, so editor routes share the view key', () => {
    expect(parseRoute(`#/lists/${LIST}/tasks/${TASK}`).viewKey).toBe(parseRoute(`#/lists/${LIST}`).viewKey);
    expect(parseRoute(`#/tasks/${TASK}`).viewKey).toBe('tasks');
    expect(parseRoute('#/tasks/view-options').viewKey).toBe('tasks');
    expect(parseRoute(`#/lists/${LIST}/view-options`).viewKey).toBe(parseRoute(`#/lists/${LIST}`).viewKey);
  });

  it('round-trips identifiers that need encoding', () => {
    const hash = formatRoute('list', { listId: 'a b/c' });
    expect(hash).toBe('#/lists/a%20b%2Fc');
    expect(parseRoute(hash).params.listId).toBe('a b/c');
  });

  it.each(['#/nope', '#/tasks/a/b', `#/lists/${LIST}/other`, '#tasks', '#/lists/%E0%A4%A', '#/settings/other'])(
    'returns null for the unknown route %s', (hash) => {
      expect(parseRoute(hash)).toBeNull();
    });

  it('rejects an unknown route name when formatting', () => {
    expect(() => formatRoute('nope')).toThrow(/Unknown route/);
  });
});

describe('createRouter', () => {
  it('opens All tasks for an empty hash without reporting an unknown route', async () => {
    const { win, onRoute, onUnknown } = await startOn('');
    expect(win.location.hash).toBe(DEFAULT_HASH);
    expect(onUnknown).not.toHaveBeenCalled();
    expect(onRoute).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'tasks' }));
  });

  it('falls back to All tasks for an unknown route and reports it', async () => {
    const { win, router, onRoute, onUnknown } = await startOn('#/nope');
    await router.idle();
    expect(onUnknown).toHaveBeenCalledWith('#/nope');
    expect(win.location.hash).toBe(DEFAULT_HASH);
    expect(onRoute).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'tasks' }));
    expect(onRoute.mock.calls.every(([route]) => route.name === 'tasks')).toBe(true);
  });

  it('restores the previous route scroll position on back', async () => {
    const { win, router, scroller } = await startOn('#/tasks');
    scroller.scrollTop = 300;
    router.navigate('#/bin');
    await router.idle();
    expect(scroller.scrollTop).toBe(0);
    scroller.scrollTop = 40;
    win.history.back();
    await router.idle();
    expect(win.location.hash).toBe('#/tasks');
    expect(scroller.scrollTop).toBe(300);
    win.history.forward();
    await router.idle();
    expect(scroller.scrollTop).toBe(40);
  });

  it('keeps the scroll position when an editor opens over the same view', async () => {
    const { router, scroller, onRoute } = await startOn('#/tasks');
    scroller.scrollTop = 120;
    router.navigate(`#/tasks/${TASK}`);
    await router.idle();
    expect(onRoute).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'task', editor: 'task' }));
    expect(scroller.scrollTop).toBe(120);
  });

  it('keeps a memory object per view, for filters and sort', async () => {
    const { win, router } = await startOn('#/tasks');
    router.memory().filter = { statuses: ['todo'] };
    router.navigate('#/bin');
    await router.idle();
    expect(router.memory().filter).toBeUndefined();
    win.history.back();
    await router.idle();
    expect(router.memory().filter).toEqual({ statuses: ['todo'] });
  });

  it('replaces the current entry when asked and stops listening on destroy', async () => {
    const { win, router, onRoute } = await startOn('#/tasks');
    router.navigate('#/settings', { replace: true });
    await router.idle();
    expect(router.current().name).toBe('settings');
    router.destroy();
    win.location.hash = '#/bin';
    await router.idle();
    expect(onRoute).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'settings' }));
    expect(win.history.scrollRestoration).toBe('manual');
  });
});
