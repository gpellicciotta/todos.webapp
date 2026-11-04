/**
 * App entry point: theme, service worker, local store, start-up maintenance, shell, routes, and shortcuts.
 *
 * On start the app cancels overdue `cancel` tasks, then purges expired recycle bin entries,
 * and then keeps the overdue timer running (`OVD-4`, `OVD-5`, `BIN-5`).
 * Shortcuts, outside text fields: `n` focuses the view's `[data-shortcut="add"]` element and `/` its
 * `[data-shortcut="search"]` element, each a no-op while the view has none; Escape closes an open editor.
 * The toaster adds Ctrl+Z or Cmd+Z, which runs the Undo of the newest toast.
 */

import { startOverdueTimer } from './core/overdue.js';
import { openStore } from './store/db.js';
import { applyTheme, openCounts, readThemePreference, renderShell, STRINGS } from './ui/layout.js';
import { createRouter, DEFAULT_HASH, formatRoute } from './ui/router.js';
import { createToaster } from './ui/toast.js';

/**
 * Register the service worker that precaches the app shell, so the app starts offline (`TEC-1`).
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch((error) => console.error('Service worker failed:', error));
  }
}

/**
 * Tell whether a key event comes from a text field, where shortcuts never fire.
 * @param {KeyboardEvent} event the key event
 * @returns {boolean} true inside inputs, textareas, selects, and editable content
 */
function inTextField(event) {
  return Boolean(event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
}

/**
 * Start the app.
 * @returns {Promise<void>} resolves once the first route rendered
 */
async function start() {
  let router;
  const shell = renderShell(document.getElementById('app'), { navigate: (hash) => router.navigate(hash) });
  const toaster = createToaster({ region: shell.toastRegion, undoShortcut: true });
  let store;
  try {
    store = await openStore({
      broadcast: true,
      onVersionChange: () => toaster.show('ToDo\'s was updated in another tab. Reload to continue.', {
        actionLabel: 'Reload',
        onAction: () => location.reload(),
      }),
    });
    const stopOverdue = startOverdueTimer({ store });
    await stopOverdue.idle();
    await store.purgeExpired();
  }
  catch (error) {
    console.error('Store failed:', error);
    shell.showBanner(error?.code === 'blocked' ? error.message : 'The local data could not be opened. Reload to try again.');
    return;
  }

  /**
   * Show the lists and open counts in the sidebar, and keep the title of a renamed list current.
   * @returns {Promise<void>}
   */
  async function refreshNav() {
    const [lists, tasks, memberships] = await Promise.all([store.listLists(), store.listTasks(), store.listMemberships()]);
    shell.setLists(lists, openCounts(tasks, memberships));
    const current = router.current();
    const list = current?.params.listId && lists.find((candidate) => candidate.id === current.params.listId);
    if (list) {
      shell.update(current, list.name);
    }
  }

  /**
   * Render a route; a list that does not exist opens All tasks with a toast.
   * @param {object} route the route
   * @returns {Promise<void>}
   */
  async function onRoute(route) {
    let title = route.name === 'list-new' ? STRINGS.newList : STRINGS.titles[route.view];
    if (route.params.listId) {
      const list = await store.getList(route.params.listId);
      if (!list || list['deletion-time']) {
        toaster.show('That list was not found. Showing All tasks.');
        router.navigate(DEFAULT_HASH, { replace: true });
        return;
      }
      title = list.name;
    }
    shell.update(route, title);
  }

  router = createRouter({
    scroller: shell.main,
    onRoute,
    onUnknown: (hash) => toaster.show(`Nothing found at ${hash}. Showing All tasks.`),
  });
  let refreshing = null;
  store.subscribe(() => {
    refreshing ??= Promise.resolve().then(() => {
      refreshing = null;
      return refreshNav();
    }).catch((error) => console.error('Navigation refresh failed:', error));
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || inTextField(event)
      || document.querySelector('dialog[open]')) {
      return;
    }
    const route = router.current();
    if (event.key === 'n' || event.key === '/') {
      const target = shell.main.querySelector(`[data-shortcut="${event.key === 'n' ? 'add' : 'search'}"]`);
      if (target) {
        event.preventDefault();
        target.focus();
      }
    }
    else if (event.key === 'Escape' && route?.editor) {
      event.preventDefault();
      router.navigate(formatRoute(route.view, route.params));
    }
  });

  await refreshNav();
  router.start();
  await router.idle();
  document.documentElement.dataset.shell = 'ready';
}

applyTheme(document, readThemePreference());
registerServiceWorker();
start();
