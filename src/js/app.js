/**
 * App entry point: theme, service worker, local store, start-up maintenance, shell, routes, and shortcuts.
 *
 * On start the app purges expired recycle bin entries, then starts the overdue timer,
 * whose first run cancels overdue `cancel` tasks (`OVD-4`, `OVD-5`, `BIN-5`).
 * A new service worker waits for the Update toast (`TEC-19`); a newer version in another tab shows a lasting banner with Reload.
 * A start-up failure shows an error banner.
 * Moving to another view moves focus to the main column, which the route title labels.
 * Shortcuts, outside text fields: `n` focuses the view's `[data-shortcut~="add"]` element and `/` its
 * `[data-shortcut~="search"]` element, each a no-op while the view has none; Escape closes an open editor.
 * The sync indicator shows the sync state beside the user button (see views/sync-indicator.js).
 * While connected, the inbox shows a bell and the broadcast banners of the service (see sync/inbox.js).
 * The toaster adds Ctrl+Z or Cmd+Z, which runs the Undo of the newest toast.
 */

import { startOverdueTimer } from './core/overdue.js';
import { openStore } from './store/db.js';
import { createEngine } from './sync/engine.js';
import { createInbox } from './sync/inbox.js';
import { createSession } from './sync/session.js';
import { applyTheme, openCounts, readThemePreference, renderShell, STRINGS } from './ui/layout.js';
import { createRouter, DEFAULT_HASH, formatRoute } from './ui/router.js';
import { watchWorkerUpdates } from './ui/sw-update.js';
import { createToaster } from './ui/toast.js';
import { mountAllTasks } from './views/all-tasks.js';
import { mountConnect } from './views/connect.js';
import { createEditorPanel } from './views/editor-panel.js';
import { mountList } from './views/list.js';
import { mountListEditor } from './views/list-editor.js';
import { mountLists } from './views/lists.js';
import { mountRecycleBin } from './views/recycle-bin.js';
import { mountSettings } from './views/settings.js';
import { createSeenMarker, mountSyncLog } from './views/sync-log.js';
import { mountTaskEditor } from './views/task-editor.js';
import { createViewModel, mountViewOptions } from './views/view-controls.js';

/** Start-up strings, for the strings module of TEC-13 to absorb. */
const MESSAGES = Object.freeze({
  updated: 'ToDo\'s was updated in another tab. Reload to continue.',
  reload: 'Reload',
  updateReady: 'A new version is ready',
  update: 'Update',
  storeFailed: 'The local data could not be opened. Reload to try again.',
  startFailed: 'ToDo\'s could not start. Reload to try again.',
});

/** Screens that fill a view, by view name. */
const SCREENS = {
  tasks: mountAllTasks, lists: mountLists, list: mountList, bin: mountRecycleBin, settings: mountSettings, 'sync-log': mountSyncLog, connect: mountConnect,
};

/** Editors of the editor panel, by the editor name of their routes. */
const EDITORS = { task: mountTaskEditor, list: mountListEditor, 'view-options': mountViewOptions };

let shell = null;

/**
 * Show the lasting banner that another tab updated the app, with Reload.
 */
function showUpdatedNotice() {
  shell.showNotice(MESSAGES.updated, { actionLabel: MESSAGES.reload, onAction: () => location.reload() });
}

/** Ask the browser for a new service worker; the Update toast appears when one is waiting (`TEC-19`, `SYN-11`). */
function checkForUpdate() {
  navigator.serviceWorker?.getRegistration()
    .then((registration) => registration?.update())
    .catch((error) => console.error('Checking for an update failed:', error));
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
  // An Auth return carries its code in the hash; take it out before the router reads the route.
  const session = createSession();
  session.capture(window);
  shell = renderShell(document.getElementById('app'), { session });
  const toaster = createToaster({ region: shell.toastRegion, undoShortcut: true });
  // The inbox loads only while connected; local mode sends no request (`LOC-3`).
  const inbox = createInbox({ session });
  shell.showInbox({ inbox, toaster });
  // Registers the worker that precaches the app shell, so the app starts offline (`TEC-1`); a new one waits for Update.
  watchWorkerUpdates({
    script: 'service-worker.js',
    toaster,
    messages: { ready: MESSAGES.updateReady, action: MESSAGES.update },
    onUpdatedElsewhere: showUpdatedNotice,
  });
  inbox.start();
  let store;
  try {
    store = await openStore({
      broadcast: true,
      onVersionChange: showUpdatedNotice,
      // While connected, every change also joins the queue that the push engine uploads (`SYN-1`).
      tracking: () => session.state() !== 'local',
    });
  }
  catch (error) {
    console.error('Store failed:', error);
    shell.showBanner(error?.code === 'blocked' ? error.message : MESSAGES.storeFailed);
    return;
  }
  // One tab uploads the queue and pulls the change feed; the others follow its state (`SYN-12`).
  // A rejected change is undone and reported (`SYN-9`), and so is the loss of access to a list (`SHR-8`).
  const engine = createEngine({
    store,
    session,
    onRejected: ({ message }) => toaster.show(message),
    onLostAccess: ({ message }) => toaster.show(message),
  });
  engine.start();
  // The indicator follows the engine and the session; its dot marks sync log entries newer than the last visit (`SYN-4`, `SYN-8`).
  const seen = createSeenMarker();
  shell.showSync({ engine, readLog: () => store.queue.log(), seen, checkForUpdate });
  let screen = null;
  let shownViewKey = null;
  // The screens and the View options panel share these, so the rows, the info line, and the panel follow one state.
  const viewModels = { tasks: createViewModel('tasks'), list: createViewModel('list') };
  const editorPanel = createEditorPanel({
    slot: shell.editor, editors: EDITORS, context: { store, toaster, viewModels, navigate: (hash) => router.navigate(hash) },
    close: () => router.navigate(formatRoute(router.current().view, router.current().params)),
    fallbackFocus: () => shell.main.querySelector('[data-shortcut~="add"]') ?? shell.main,
  });

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
      const options = { store, toaster, session, sync: engine, seen, viewModels, memory: router.memory(), navigate: (hash, settings) => router.navigate(hash, settings) };
      screen = { element, controller: mount ? mount(element, options) : null };
    }
    screen.controller?.update(route);
    editorPanel.update(route);
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
      const target = shell.main.querySelector(`[data-shortcut~="${event.key === 'n' ? 'add' : 'search'}"]`);
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

  // The first view paints before the sidebar and the start-up maintenance read the store, so the view opens sooner (`TEC-16`).
  router.start();
  await router.idle();
  await screen?.controller?.idle?.();
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
  try {
    await refreshNav();
    await store.purgeExpired();
    await startOverdueTimer({ store }).idle();
  }
  catch (error) {
    console.error('Store failed:', error);
    shell.showBanner(MESSAGES.storeFailed);
    return;
  }
  document.documentElement.dataset.shell = 'ready';
}

applyTheme(document, readThemePreference());
start().catch((error) => {
  console.error('Start-up failed:', error);
  if (shell) {
    shell.showBanner(MESSAGES.startFailed);
  }
  else {
    document.getElementById('app').textContent = MESSAGES.startFailed;
  }
});
