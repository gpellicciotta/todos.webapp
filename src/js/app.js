/**
 * App entry point: theme, service worker, local store, start-up maintenance, shell, routes, and shortcuts.
 *
 * On start the app purges expired recycle bin entries, then starts the overdue timer,
 * whose first run cancels overdue `cancel` tasks (`OVD-4`, `OVD-5`, `BIN-5`).
 * A newer version in another tab shows a lasting banner with Reload; a start-up failure shows an error banner.
 * Moving to another view moves focus to the main column, which the route title labels.
 * Shortcuts, outside text fields: `n` focuses the view's `[data-shortcut="add"]` element and `/` its
 * `[data-shortcut="search"]` element, each a no-op while the view has none; Escape closes an open editor.
 * The toaster adds Ctrl+Z or Cmd+Z, which runs the Undo of the newest toast.
 */

import { startOverdueTimer } from './core/overdue.js';
import { openStore } from './store/db.js';
import { applyTheme, openCounts, readThemePreference, renderShell, STRINGS } from './ui/layout.js';
import { createRouter, DEFAULT_HASH, formatRoute } from './ui/router.js';
import { createToaster } from './ui/toast.js';
import { mountAllTasks } from './views/all-tasks.js';

/** Start-up strings, for the strings module of TEC-13 to absorb. */
const MESSAGES = Object.freeze({
  updated: 'ToDo\'s was updated in another tab. Reload to continue.',
  reload: 'Reload',
  storeFailed: 'The local data could not be opened. Reload to try again.',
  startFailed: 'ToDo\'s could not start. Reload to try again.',
});

/** Screens that fill a view, by view name; the other views stay empty until their tasks land. */
const SCREENS = { tasks: mountAllTasks };

let shell = null;

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
  shell = renderShell(document.getElementById('app'), { navigate: (hash) => router.navigate(hash) });
  const toaster = createToaster({ region: shell.toastRegion, undoShortcut: true });
  let store;
  try {
    store = await openStore({
      broadcast: true,
      onVersionChange: () => shell.showNotice(MESSAGES.updated, { actionLabel: MESSAGES.reload, onAction: () => location.reload() }),
    });
    await store.purgeExpired();
    const stopOverdue = startOverdueTimer({ store });
    await stopOverdue.idle();
  }
  catch (error) {
    console.error('Store failed:', error);
    shell.showBanner(error?.code === 'blocked' ? error.message : MESSAGES.storeFailed);
    return;
  }
  let screen = null;
  let shownViewKey = null;

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
    const element = shell.update(route, title);
    if (screen?.element !== element) {
      screen?.controller?.destroy();
      const mount = SCREENS[route.view];
      screen = { element, controller: mount ? mount(element, { store, toaster, memory: router.memory() }) : null };
    }
    screen.controller?.update(route);
    if (shownViewKey !== null && shownViewKey !== route.viewKey) {
      shell.main.focus({ preventScroll: true });
    }
    shownViewKey = route.viewKey;
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
start().catch((error) => {
  console.error('Start-up failed:', error);
  if (shell) {
    shell.showBanner(MESSAGES.startFailed);
  }
  else {
    document.getElementById('app').textContent = MESSAGES.startFailed;
  }
});
