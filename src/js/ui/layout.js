/**
 * App shell layout: the top bar, the sidebar, the main column, the editor panel slot, and the bottom bar.
 *
 * Both layouts live in one DOM; app-shell.css shows the compact one below 64rem and the wide one from 64rem.
 * Each route gets an empty `[data-view]` element in the main column for its screen to fill.
 * The sidebar and the bottom bar hold the task destinations; the user menu at the end of the top bar holds
 * the account, Recycle bin, and Settings (see user-menu.js).
 * The current route is marked with `aria-current="page"` in the sidebar, the bottom bar, and the user menu.
 * The sync indicator opens the end of the top bar, before the bell of the inbox and the user button (see views/sync-indicator.js).
 * The bell of the inbox joins the user menu while connected, and broadcast banners show above every view (see inbox.js).
 * A session banner above the views offers Sign in while the session expired.
 * The sidebar lists follow the order of this device; Alt+Up and Alt+Down on a list link move it (`LST-8`).
 * Each list shows its open task count from core/list-counts.js, the pass shared with the Lists screen.
 * The theme follows the system unless the device stores a preference, which `data-theme` applies.
 */

import { countOf } from '../core/list-counts.js';
import { applyListOrder, movedMessage, moveList, onListOrderChange, readListOrder, writeListOrder } from '../core/list-order.js';
import { readTheme } from '../core/preferences.js';
import { createSession } from '../sync/session.js';
import { attachSyncIndicator } from '../views/sync-indicator.js';
import { attachInbox } from './inbox.js';
import { createLiveRegion } from './live-region.js';
import { attachUserMenu } from './user-menu.js';

const ICONS = 'img/icons.svg';

/** Shell strings, for the strings module of TEC-13 to absorb. */
export const STRINGS = Object.freeze({
  app: "ToDo's",
  main: 'Main',
  newList: 'New list',
  openTasks: ' open tasks',
  lists: 'Lists',
  titles: Object.freeze({
    tasks: 'All tasks', lists: 'Lists', list: 'List', bin: 'Recycle bin',
    settings: 'Settings', 'sync-log': 'Sync log', connect: 'Connect',
  }),
});

/** Destinations of both navigation bars: a sidebar label and a shorter bottom bar label. */
const DESTINATIONS = [
  { key: 'tasks', hash: '#/tasks', icon: 'tasks', label: 'All tasks', short: 'Tasks', count: true },
  { key: 'lists', hash: '#/lists', icon: 'lists', label: 'Lists', short: 'Lists' },
];

/** Navigation destination of each view; the Recycle bin and Settings destinations sit in the user menu. */
const NAV_OF_VIEW = { tasks: 'tasks', lists: 'lists', list: 'lists', bin: 'bin', settings: 'settings', 'sync-log': 'settings', connect: 'connect' };

/**
 * Read the device's theme preference; storage that is missing or blocked means the system theme.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {'light'|'dark'|'system'} the preference
 */
export function readThemePreference(getStorage) {
  return readTheme(getStorage);
}

/**
 * Apply a theme preference to the page through `data-theme` on `<html>`, and to the browser bar color.
 * A stored theme gives every `theme-color` meta that theme's color, whatever the system scheme.
 * @param {Document} doc the document
 * @param {'light'|'dark'|'system'} preference the preference; `system` removes the attribute
 */
export function applyTheme(doc, preference) {
  const pinned = preference === 'light' || preference === 'dark';
  if (pinned) {
    doc.documentElement.dataset.theme = preference;
  }
  else {
    delete doc.documentElement.dataset.theme;
  }
  const metas = [...doc.querySelectorAll('meta[name="theme-color"]')];
  for (const meta of metas) {
    meta.dataset.color ??= meta.content;
  }
  const color = pinned ? metas.find((meta) => meta.media.includes(preference))?.dataset.color : null;
  for (const meta of metas) {
    meta.content = color ?? meta.dataset.color;
  }
}

/**
 * Return the markup of a sprite icon.
 * @param {string} id the symbol identifier
 * @returns {string} the SVG markup
 */
function icon(id) {
  return `<svg class="icon" aria-hidden="true" focusable="false"><use href="${ICONS}#${id}"/></svg>`;
}

/**
 * Return the markup of a sidebar navigation item.
 * @param {object} destination the destination
 * @returns {string} the markup
 */
function sidebarItem(destination) {
  const count = destination.count ? '<span class="nav-item__count" data-count="all"></span>' : '';
  return `<li><a class="nav-item" href="${destination.hash}" data-nav="${destination.key}">${icon(destination.icon)}`
    + `<span class="nav-item__label">${destination.label}</span>${count}</a></li>`;
}

/**
 * Fill a count element with a number and its visually hidden meaning.
 * @param {HTMLElement} element the `.nav-item__count` element
 * @param {number} count the open task count
 */
function setCount(element, count) {
  element.textContent = String(count);
  const hidden = element.ownerDocument.createElement('span');
  hidden.className = 'visually-hidden';
  hidden.textContent = STRINGS.openTasks;
  element.append(hidden);
}

/**
 * Render the app shell into a root element.
 * @param {HTMLElement} root the element that holds the shell
 * @param {object} options shell options
 * @param {object} [options.session] the session the user menu follows, a new one by default
 * @returns {{main: HTMLElement, editor: HTMLElement, toastRegion: HTMLElement, update: Function,
 *   setLists: Function, showBanner: Function, showNotice: Function, showInbox: Function, showSync: Function}} the shell controller
 */
export function renderShell(root, { session = createSession() } = {}) {
  const doc = root.ownerDocument;
  root.classList.add('app');
  root.innerHTML = `
    <header class="app__top-bar">
      <h1 class="app__title" id="app-title"></h1>
      <div data-user-menu></div>
    </header>
    <nav class="sidebar app__sidebar" aria-label="${STRINGS.main}">
      <p class="sidebar__brand"><img class="sidebar__brand-icon" src="img/app-icon.svg" alt="" width="24" height="24" aria-hidden="true">${STRINGS.app}</p>
      <ul class="nav-list">${DESTINATIONS.map(sidebarItem).join('')}</ul>
      <ul class="nav-list" aria-label="${STRINGS.lists}" data-nav-lists></ul>
    </nav>
    <main class="app__main" id="main" tabindex="-1" aria-labelledby="app-title"><div class="app__banners"><div data-session-banner></div><div data-notice></div><div class="app__broadcasts"></div></div></main>
    <div class="app__editor" data-editor-slot hidden></div>
    <nav class="bottom-nav app__bottom-nav" aria-label="${STRINGS.main}">
      <ul class="bottom-nav__list">${DESTINATIONS.map((destination) => `<li><a class="bottom-nav__item" href="${destination.hash}" `
        + `data-nav="${destination.key}">${icon(destination.icon)}${destination.short}</a></li>`).join('')}</ul>
    </nav>
    <div class="toast-region" role="region" aria-label="Notifications"></div>`;

  const title = root.querySelector('#app-title');
  const main = root.querySelector('.app__main');
  const banners = root.querySelector('.app__banners');
  const notice = root.querySelector('[data-notice]');
  const broadcasts = root.querySelector('.app__broadcasts');
  const sessionBanner = root.querySelector('[data-session-banner]');
  const editor = root.querySelector('[data-editor-slot]');
  const listNav = root.querySelector('[data-nav-lists]');
  const menuSlot = root.querySelector('[data-user-menu]');
  attachUserMenu(menuSlot, { session });
  let viewKey = null;
  let route = null;
  let view = null;
  let announcer = null;
  let shownLists = [];
  let shownCounts = { all: 0, byList: new Map() };

  /** Mark the links of the current route with `aria-current="page"`. */
  function markCurrent() {
    const listKey = route?.params.listId ? `list:${route.params.listId}` : null;
    const navKey = NAV_OF_VIEW[route?.view];
    for (const link of root.querySelectorAll('[data-nav]')) {
      const inSidebar = Boolean(link.closest('.app__sidebar'));
      const current = link.dataset.nav === (inSidebar && listKey ? listKey : navKey);
      if (current) {
        link.setAttribute('aria-current', 'page');
      }
      else {
        link.removeAttribute('aria-current');
      }
    }
  }

  /** Render the sidebar lists from the last lists and counts, in the stored order. */
  function renderLists() {
    setCount(root.querySelector('[data-count="all"]'), shownCounts.all);
    listNav.replaceChildren(...applyListOrder(shownLists, readListOrder()).map((list) => {
      const item = doc.createElement('li');
      const link = doc.createElement('a');
      link.className = 'nav-item nav-item--list';
      link.href = `#/lists/${encodeURIComponent(list.id)}`;
      link.dataset.nav = `list:${list.id}`;
      const label = doc.createElement('span');
      label.className = 'nav-item__label';
      label.textContent = list.name;
      const count = doc.createElement('span');
      count.className = 'nav-item__count';
      setCount(count, countOf(shownCounts, list.id).open);
      link.append(label, count);
      item.append(link);
      return item;
    }));
    markCurrent();
  }

  /**
   * Move the focused list link with Alt+Up and Alt+Down, keeping focus on it and announcing the position.
   * @param {KeyboardEvent} event the key event
   */
  function onListKeydown(event) {
    const link = event.target.closest?.('[data-nav^="list:"]');
    if (!link || !event.altKey || event.ctrlKey || event.metaKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const ordered = applyListOrder(shownLists, readListOrder());
    const id = link.dataset.nav.slice('list:'.length);
    const ids = ordered.map((list) => list.id);
    const next = moveList(ids, id, event.key === 'ArrowUp' ? -1 : 1);
    if (next.join() === ids.join()) {
      return;
    }
    if (writeListOrder(next)) {
      [...listNav.querySelectorAll('[data-nav]')].find((candidate) => candidate.dataset.nav === `list:${id}`)?.focus();
      announcer ??= createLiveRegion({ document: doc, parent: root });
      announcer.announce(movedMessage(ordered.find((list) => list.id === id).name, next.indexOf(id) + 1, next.length));
    }
  }

  listNav.addEventListener('keydown', onListKeydown);
  const unsubscribeOrder = onListOrderChange(() => {
    if (root.isConnected) {
      renderLists();
    }
    else {
      unsubscribeOrder();
    }
  });

  return {
    main,
    editor,
    toastRegion: root.querySelector('.toast-region'),

    /**
     * Show a route: its title, its navigation mark, an empty view, and the editor slot state.
     * The view element stays while only the editor changes, so a screen keeps its state.
     * @param {object} next the route, from the router
     * @param {string} text the title
     * @returns {HTMLElement} the view element
     */
    update(next, text) {
      route = next;
      title.textContent = text;
      doc.title = `${text} · ${STRINGS.app}`;
      if (viewKey !== next.viewKey) {
        viewKey = next.viewKey;
        view = doc.createElement('div');
        view.className = 'app__view';
        view.dataset.view = next.view;
        if (next.params.listId) {
          view.dataset.listId = next.params.listId;
        }
        main.replaceChildren(banners, view);
      }
      editor.dataset.editor = next.editor ?? '';
      editor.dataset.taskId = next.params.taskId ?? '';
      markCurrent();
      return view;
    },

    /**
     * Show the lists in the sidebar in the order of this device, each with its open task count.
     * @param {object[]} lists the lists outside the recycle bin, in any order
     * @param {{all: number, byList: Map<string, object>}} counts the result of `countLists`
     */
    setLists(lists, counts) {
      shownLists = lists;
      shownCounts = counts;
      renderLists();
    },

    /**
     * Replace the main column with an error banner, for failures that stop the app.
     * @param {string} message the error message
     */
    showBanner(message) {
      const banner = doc.createElement('div');
      banner.className = 'banner banner--error';
      banner.setAttribute('role', 'alert');
      banner.innerHTML = `${icon('alert').replace('class="icon"', 'class="icon banner__icon"')}<p class="banner__text"></p>`;
      banner.querySelector('p').textContent = message;
      view = doc.createElement('div');
      view.className = 'app__view';
      view.append(banner);
      viewKey = null;
      main.replaceChildren(banners, view);
    },

    /**
     * Show a lasting banner above every view, such as a newer version in another tab.
     * The polite live region announces it, since a status role added with its text is often not read.
     * @param {string} message the message
     * @param {{actionLabel: string, onAction: () => void}} [action] a button in the banner
     */
    showNotice(message, action) {
      const banner = doc.createElement('div');
      banner.className = 'banner';
      banner.innerHTML = `${icon('alert').replace('class="icon"', 'class="icon banner__icon"')}<p class="banner__text"></p>`;
      banner.querySelector('p').textContent = message;
      if (action) {
        const button = doc.createElement('button');
        button.className = 'button button--secondary';
        button.type = 'button';
        button.textContent = action.actionLabel;
        button.addEventListener('click', action.onAction);
        banner.append(button);
      }
      notice.replaceChildren(banner);
      announcer ??= createLiveRegion({ document: doc, parent: root });
      announcer.announce(message);
    },

    /**
     * Show the inbox: the bell before the user button and the broadcast banners above every view.
     * @param {object} options the dependencies
     * @param {object} options.inbox the inbox
     * @param {{show: (message: string) => void}} options.toaster the toaster
     * @returns {{destroy: () => void}} the inbox view
     */
    showInbox({ inbox, toaster }) {
      announcer ??= createLiveRegion({ document: doc, parent: root });
      return attachInbox(menuSlot, { inbox, session, banners: broadcasts, toaster, announce: (message) => announcer.announce(message) });
    },

    /**
     * Show the sync indicator before the other buttons of the top bar, and the session banner above every view.
     * @param {object} options the dependencies
     * @param {object} options.engine the sync engine
     * @param {() => Promise<object[]>} options.readLog reads the sync log records
     * @param {{get: () => string|null, subscribe: Function}} options.seen the marker of the last visit to the Sync log
     * @param {() => void} options.checkForUpdate asks the browser for a new service worker
     * @returns {{destroy: () => void}} the indicator
     */
    showSync({ engine, readLog, seen, checkForUpdate }) {
      announcer ??= createLiveRegion({ document: doc, parent: root });
      return attachSyncIndicator(menuSlot, {
        engine, session, readLog, seen, checkForUpdate, banners: sessionBanner, announce: (message) => announcer.announce(message),
      });
    },
  };
}
