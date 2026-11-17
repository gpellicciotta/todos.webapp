/**
 * App shell layout: the areas of the vendored shell.css (ADR-0004 of support.webapp) in the main scroll mode.
 *
 * A skip link, the top bar, the sidebar, the banners, the main column, the side panel of the editors, the action bar,
 * the bottom bar, and the overlay layer with the toast region and the floating button.
 * Both layouts live in one DOM; shell.css shows the compact one below 64rem and the wide one from 64rem.
 * Each route gets an empty `[data-view]` element in the main column for its screen to fill.
 * A screen puts its add block in the action bar, which joins the shell only while it holds content.
 * Banner slots hide while empty, so the banner area takes no room without a banner.
 * The sidebar and the bottom bar hold the task destinations; the user menu at the end of the top bar holds
 * the account, Recycle bin, and Settings (see user-menu.js).
 * The current route is marked with `aria-current="page"` in the sidebar, the bottom bar, and the user menu.
 * From 64rem, a view's three-dot actions button sits just before the user button (see view-actions.js).
 * The sync indicator opens the end of the top bar, before the bell of the inbox and the user button (see views/sync-indicator.js).
 * The bell of the inbox joins the user menu while connected, and broadcast banners show above every view (see inbox.js).
 * A session banner above the views offers Sign in while the session expired.
 * The sidebar lists follow the order of this device; Alt+Up and Alt+Down on a list link move it one place, and
 * Alt+Home and Alt+End to the top or bottom (`LST-8`, `LST-13`).
 * Each list shows its open task count from core/list-counts.js, the pass shared with the Lists screen.
 * The wide sidebar keeps the brand, All tasks, and Lists fixed and scrolls only its list rows (`LST-14`).
 * Rows are patched by list identifier, so focus and scroll survive a count change; a route to a list scrolls its row
 * to the nearest edge once. A count of 0 shows nothing and a count above 999 reads "999+"; hidden text keeps the number.
 * From 12 lists, or while it holds text, a find field above the rows filters them by name once typing pauses for 150 ms,
 * counts matches ("4 of 124"), and announces them politely; Enter opens the first match, Escape clears, Down enters the rows,
 * and `l` focuses it (`LST-10`, `LST-15`). The rows are one roving tab stop with Up, Down, Home, End, and Page keys.
 * From 64rem, separators resize the sidebar and the editor panel and the widths stay on the device (see panel-resize.js).
 * The theme follows the system unless the device stores a preference, which `data-theme` applies.
 */

import { countOf } from '../core/list-counts.js';
import { FIND_MAX_LENGTH, findLists } from '../core/list-find.js';
import {
  applyListOrder, movedMessage, moveList, moveListToEnd, onListOrderChange, readListOrder, writeListOrder,
} from '../core/list-order.js';
import { readTheme } from '../core/preferences.js';
import { createSession } from '../sync/session.js';
import { attachSyncIndicator } from '../views/sync-indicator.js';
import { attachInbox } from './inbox.js';
import { attachPanelResize } from './panel-resize.js';
import { createLiveRegion } from '../../vendor/design/js/live-region.js';
import { attachUserMenu } from './user-menu.js';

const ICONS = 'img/icons.svg';

/** The largest count shown as a number; a larger count reads "999+" (`LST-14`). */
const MAX_SHOWN_COUNT = 999;

/** From this many lists the sidebar shows its find field (`LST-10`). */
const FIND_FROM = 12;

/** The pause after typing before the rows filter and the match count is announced (`TEC-16`). */
const FIND_PAUSE_MS = 150;

/** The order change of each Alt key on a list link: one place, or to an end (`LST-8`, `LST-13`). */
const LIST_MOVES = Object.freeze({
  ArrowUp: (ids, id) => moveList(ids, id, -1),
  ArrowDown: (ids, id) => moveList(ids, id, 1),
  Home: (ids, id) => moveListToEnd(ids, id, -1),
  End: (ids, id) => moveListToEnd(ids, id, 1),
});

/** Rows a Page key moves when the region has no measured height. */
const PAGE_ROWS = 10;

/** The height of a row with its gap, in pixels, to turn the region height into a Page step. */
const ROW_HEIGHT = 44;

/** Shell strings, for the strings module of TEC-13 to absorb. */
export const STRINGS = Object.freeze({
  app: "ToDo's",
  main: 'Main',
  skip: 'Skip to content',
  newList: 'New list',
  openTasks: ' open tasks',
  lists: 'Lists',
  findLists: 'Find a list',
  noListMatches: 'No list matches.',
  titles: Object.freeze({
    tasks: 'All tasks', lists: 'Lists', list: 'List', bin: 'Recycle bin',
    settings: 'Settings', 'sync-log': 'Sync log',
  }),
});

/** Destinations of both navigation bars: a sidebar label and a shorter bottom bar label. */
const DESTINATIONS = [
  { key: 'tasks', hash: '#/tasks', icon: 'tasks', label: 'All tasks', short: 'Tasks', count: true },
  { key: 'lists', hash: '#/lists', icon: 'lists', label: 'Lists', short: 'Lists' },
];

/** Navigation destination of each view; the Recycle bin and Settings destinations sit in the user menu. */
const NAV_OF_VIEW = { tasks: 'tasks', lists: 'lists', list: 'lists', bin: 'bin', settings: 'settings', 'sync-log': 'settings' };

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
  return `<li><a class="app__nav-item nav-item" href="${destination.hash}" data-nav="${destination.key}">${icon(destination.icon)}`
    + `<span class="nav-item__label">${destination.label}</span>${count}</a></li>`;
}

/**
 * Fill a count element with a number and its visually hidden meaning.
 * @param {HTMLElement} element the `.nav-item__count` element
 * @param {number} count the open task count
 */
function setCount(element, count) {
  if (!element.firstElementChild) {
    const shown = element.ownerDocument.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    const hidden = element.ownerDocument.createElement('span');
    hidden.className = 'visually-hidden';
    element.append(shown, hidden);
  }
  const [shown, hidden] = element.children;
  shown.textContent = count === 0 ? '' : count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : String(count);
  hidden.textContent = `${count}${STRINGS.openTasks}`;
}

/**
 * Render the app shell into a root element.
 * @param {HTMLElement} root the element that holds the shell
 * @param {object} options shell options
 * @param {object} [options.session] the session the user menu follows, a new one by default
 * @returns {{main: HTMLElement, editor: HTMLElement, actionBar: HTMLElement, actionsSlot: HTMLElement, overlays: HTMLElement, toastRegion: HTMLElement,
 *   update: Function, setLists: Function, showBanner: Function, showNotice: Function, showInbox: Function, showSync: Function}}
 *   the shell controller
 */
export function renderShell(root, { session = createSession() } = {}) {
  const doc = root.ownerDocument;
  root.classList.add('app', 'app--scroll-main');
  root.innerHTML = `
    <a class="skip-link" href="#main">${STRINGS.skip}</a>
    <header class="app__top-bar">
      <h1 class="app__title" id="app-title"></h1>
      <div class="app__top-actions" data-user-menu></div>
    </header>
    <nav class="sidebar app__sidebar" aria-label="${STRINGS.main}">
      <p class="sidebar__brand"><img class="sidebar__brand-icon" src="img/todos-icon.svg" alt="" width="24" height="24" aria-hidden="true">${STRINGS.app}</p>
      <ul class="nav-list app__nav-list">${DESTINATIONS.map(sidebarItem).join('')}</ul>
      <div class="sidebar__find" hidden>
        <input class="field__control" type="search" maxlength="${FIND_MAX_LENGTH}" autocomplete="off" spellcheck="false" enterkeyhint="go"
          aria-label="${STRINGS.findLists}" placeholder="${STRINGS.findLists}" data-find-lists data-shortcut="find-list">
        <span class="sidebar__find-count" aria-hidden="true"></span>
      </div>
      <div class="sidebar__scroll">
        <p class="sidebar__find-empty" hidden>${STRINGS.noListMatches}</p>
        <ul class="nav-list app__nav-list" aria-label="${STRINGS.lists}" data-nav-lists></ul>
      </div>
    </nav>
    <div class="app__banners"><div data-session-banner hidden></div><div data-notice hidden></div><div class="app__broadcasts" hidden></div></div>
    <main class="app__main" id="main" tabindex="-1" aria-labelledby="app-title"></main>
    <aside class="app__side-panel" data-editor-slot hidden></aside>
    <nav class="bottom-nav app__bottom-nav" aria-label="${STRINGS.main}">
      <ul class="bottom-nav__list app__nav-list">${DESTINATIONS.map((destination) => '<li><a class="app__nav-item bottom-nav__item" '
        + `href="${destination.hash}" data-nav="${destination.key}">${icon(destination.icon)}${destination.short}</a></li>`).join('')}</ul>
    </nav>
    <div class="app__overlays"><div class="toast-region" role="region" aria-label="Notifications"></div></div>`;

  const title = root.querySelector('#app-title');
  const main = root.querySelector('.app__main');
  const banners = root.querySelector('.app__banners');
  const editor = root.querySelector('[data-editor-slot]');
  const overlays = root.querySelector('.app__overlays');
  const actionBar = doc.createElement('div');
  actionBar.className = 'app__action-bar';
  const notice = root.querySelector('[data-notice]');
  const broadcasts = root.querySelector('.app__broadcasts');
  const sessionBanner = root.querySelector('[data-session-banner]');
  const listNav = root.querySelector('[data-nav-lists]');
  const menuSlot = root.querySelector('[data-user-menu]');
  attachUserMenu(menuSlot, { session });
  const actionsSlot = doc.createElement('div');
  actionsSlot.className = 'app__view-actions';
  actionsSlot.dataset.viewActions = '';
  actionsSlot.hidden = true;
  menuSlot.querySelector('.account-menu').before(actionsSlot);
  attachPanelResize(root);
  let viewKey = null;
  let route = null;
  let view = null;
  let announcer = null;
  let shownLists = [];
  let shownCounts = { all: 0, byList: new Map() };
  const rows = new Map();
  let currentListId = null;
  let revealId = null;
  let tabStopId = null;
  let findTimer = null;
  const findBox = root.querySelector('.sidebar__find');
  const findField = root.querySelector('[data-find-lists]');
  const findCount = root.querySelector('.sidebar__find-count');
  const findEmpty = root.querySelector('.sidebar__find-empty');
  const listScroll = root.querySelector('.sidebar__scroll');

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

  /** Render the sidebar lists from the last lists and counts, in the stored order, filtered by the find text. */
  function renderLists() {
    patchRows();
    applyFilter();
    revealCurrent();
  }

  /**
   * Filter the rows by the find text, which matches names only and keeps the manual order (`LST-10`).
   * Shows the field from 12 lists or while it holds text, the count at its end, and the no-match line.
   * @returns {{matches: number, total: number, text: string}} the outcome, for the announcement
   */
  function applyFilter() {
    const text = findField.value.trim();
    const total = rows.size;
    const found = new Set(findLists(shownLists, text).map((list) => list.id));
    for (const [id, parts] of rows) {
      parts.item.hidden = !found.has(id);
    }
    findBox.hidden = total < FIND_FROM && text === '';
    findCount.textContent = text === '' ? '' : `${found.size} of ${total}`;
    findEmpty.hidden = text === '' || found.size > 0;
    syncTabStop();
    return { matches: found.size, total, text };
  }

  /** @returns {HTMLAnchorElement[]} the links of the rows the filter shows, in order */
  function shownLinks() {
    return [...listNav.querySelectorAll('li:not([hidden]) > [data-nav]')];
  }

  /** Make exactly one shown row the tab stop: the last focused, else the current list, else the first (`LST-15`). */
  function syncTabStop() {
    const links = shownLinks();
    const wanted = links.find((link) => link.dataset.nav === `list:${tabStopId}`)
      ?? links.find((link) => link.dataset.nav === `list:${currentListId}`) ?? links[0];
    for (const parts of rows.values()) {
      parts.link.tabIndex = parts.link === wanted ? 0 : -1;
    }
  }

  /**
   * Announce the match count through the polite live region.
   * @param {{matches: number, total: number, text: string}} outcome the result of `applyFilter`
   */
  function announceFind({ matches, total, text }) {
    announcer ??= createLiveRegion({ document: doc });
    announcer.announce(text === '' ? `${total} lists.` : matches === 0 ? STRINGS.noListMatches : `${matches} of ${total} lists match.`);
  }

  /**
   * Clear the find field and show every row.
   * @param {boolean} [announce] whether to announce the full count
   */
  function clearFind(announce = false) {
    clearTimeout(findTimer);
    findField.value = '';
    const outcome = applyFilter();
    if (announce) {
      announceFind(outcome);
    }
  }

  /**
   * Handle the keys of the find field: Enter opens the first match, Escape clears, Down enters the rows.
   * @param {KeyboardEvent} event the key event
   */
  function onFindKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(findTimer);
      const outcome = applyFilter();
      const first = shownLinks()[0];
      if (first && outcome.text !== '') {
        first.click();
      }
    }
    else if (event.key === 'Escape' && findField.value !== '') {
      event.preventDefault();
      clearFind(true);
    }
    else if (event.key === 'ArrowDown') {
      const first = shownLinks()[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  /**
   * Move focus between the list rows with Up, Down, Home, End, PageUp, and PageDown, keeping one tab stop (`LST-15`).
   * @param {KeyboardEvent} event the key event
   */
  function onRowsKeydown(event) {
    const link = event.target.closest?.('[data-nav^="list:"]');
    if (!link || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const links = shownLinks();
    const at = links.indexOf(link);
    const page = listScroll.clientHeight ? Math.max(1, Math.floor(listScroll.clientHeight / ROW_HEIGHT)) : PAGE_ROWS;
    const steps = { ArrowUp: at - 1, ArrowDown: at + 1, Home: 0, End: links.length - 1, PageUp: at - page, PageDown: at + page };
    if (at < 0 || !(event.key in steps)) {
      return;
    }
    event.preventDefault();
    const target = links[Math.min(links.length - 1, Math.max(0, steps[event.key]))];
    target.focus();
    target.scrollIntoView?.({ block: 'nearest' });
  }

  /** Patch the rows by list identifier from the last lists and counts, in the stored order. */
  function patchRows() {
    setCount(root.querySelector('[data-count="all"]'), shownCounts.all);
    const ordered = applyListOrder(shownLists, readListOrder());
    const keep = new Set(ordered.map((list) => list.id));
    for (const [id, parts] of rows) {
      if (!keep.has(id)) {
        parts.item.remove();
        rows.delete(id);
      }
    }
    let cursor = listNav.firstElementChild;
    for (const list of ordered) {
      const parts = rows.get(list.id) ?? createRow(list);
      rows.set(list.id, parts);
      if (parts.label.textContent !== list.name) {
        parts.label.textContent = list.name;
        parts.link.title = list.name;
      }
      setCount(parts.count, countOf(shownCounts, list.id).open);
      if (parts.item === cursor) {
        cursor = cursor.nextElementSibling;
      }
      else {
        listNav.insertBefore(parts.item, cursor);
      }
    }
    markCurrent();
    revealCurrent();
  }

  /**
   * Create the row of a list; later renders patch it by list identifier.
   * @param {{id: string, name: string}} list the list
   * @returns {{item: HTMLElement, link: HTMLElement, label: HTMLElement, count: HTMLElement}} the row parts
   */
  function createRow(list) {
    const item = doc.createElement('li');
    const link = doc.createElement('a');
    link.className = 'app__nav-item nav-item nav-item--list';
    link.href = `#/lists/${encodeURIComponent(list.id)}`;
    link.dataset.nav = `list:${list.id}`;
    const label = doc.createElement('span');
    label.className = 'nav-item__label';
    const count = doc.createElement('span');
    count.className = 'nav-item__count';
    link.append(label, count);
    item.append(link);
    return { item, link, label, count };
  }

  /** Scroll the row of the current list to the nearest edge once, after a route change to that list. */
  function revealCurrent() {
    const parts = revealId ? rows.get(revealId) : null;
    if (parts && !parts.item.hidden) {
      revealId = null;
      parts.link.scrollIntoView({ block: 'nearest' });
    }
  }

  /**
   * Move the focused list link one place with Alt+Up and Alt+Down, or to an end with Alt+Home and Alt+End (`LST-13`),
   * keeping focus on it, scrolled into view, and announcing the position.
   * @param {KeyboardEvent} event the key event
   */
  function onListKeydown(event) {
    const link = event.target.closest?.('[data-nav^="list:"]');
    const move = LIST_MOVES[event.key];
    if (!link || !event.altKey || event.ctrlKey || event.metaKey || !move) {
      return;
    }
    event.preventDefault();
    const ordered = applyListOrder(shownLists, readListOrder());
    const id = link.dataset.nav.slice('list:'.length);
    const ids = ordered.map((list) => list.id);
    const next = move(ids, id);
    if (next.join() === ids.join()) {
      return;
    }
    if (writeListOrder(next)) {
      const moved = [...listNav.querySelectorAll('[data-nav]')].find((candidate) => candidate.dataset.nav === `list:${id}`);
      moved?.focus();
      // Focus may have stayed on the link as it moved, so the browser does not scroll it into view by itself.
      moved?.scrollIntoView?.({ block: 'nearest' });
      announcer ??= createLiveRegion({ document: doc });
      announcer.announce(movedMessage(ordered.find((list) => list.id === id).name, next.indexOf(id) + 1, next.length));
    }
  }

  /** Show each banner slot only while it holds a banner, and the action bar only while it holds content. */
  function fitAreas() {
    for (const slot of banners.children) {
      slot.hidden = slot.childElementCount === 0;
    }
    if (actionBar.childElementCount === 0) {
      actionBar.remove();
    }
    else if (!actionBar.isConnected) {
      editor.after(actionBar);
    }
  }

  const observer = new doc.defaultView.MutationObserver(fitAreas);
  for (const target of [...banners.children, actionBar]) {
    observer.observe(target, { childList: true });
  }
  // The skip link focuses the main column itself, since a `#main` hash would leave the route.
  root.querySelector('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    main.focus();
  });
  listNav.addEventListener('keydown', onListKeydown);
  listNav.addEventListener('keydown', onRowsKeydown);
  listNav.addEventListener('focusin', (event) => {
    const link = event.target.closest?.('[data-nav^="list:"]');
    if (link) {
      tabStopId = link.dataset.nav.slice('list:'.length);
      syncTabStop();
    }
  });
  // A click on a result opens it, so the field starts empty again for the next jump.
  listNav.addEventListener('click', () => {
    if (findField.value !== '') {
      clearFind();
    }
  });
  findField.addEventListener('keydown', onFindKeydown);
  findField.addEventListener('input', () => {
    clearTimeout(findTimer);
    findTimer = setTimeout(() => announceFind(applyFilter()), FIND_PAUSE_MS);
  });
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
    actionBar,
    actionsSlot,
    overlays,
    toastRegion: root.querySelector('.toast-region'),

    /**
     * Show a route: its title, its navigation mark, an empty view, and the editor slot state.
     * The view element and the action bar stay while only the editor changes, so a screen keeps its state.
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
        main.replaceChildren(view);
        actionBar.replaceChildren();
      }
      editor.dataset.editor = next.editor ?? '';
      editor.dataset.taskId = next.params.taskId ?? '';
      const listId = next.params.listId ?? null;
      if (listId !== currentListId) {
        currentListId = listId;
        revealId = listId;
      }
      markCurrent();
      revealCurrent();
      syncTabStop();
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
      main.replaceChildren(view);
      actionBar.replaceChildren();
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
      announcer ??= createLiveRegion({ document: doc });
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
      announcer ??= createLiveRegion({ document: doc });
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
      announcer ??= createLiveRegion({ document: doc });
      return attachSyncIndicator(menuSlot, {
        engine, session, readLog, seen, checkForUpdate, banners: sessionBanner, announce: (message) => announcer.announce(message),
      });
    },
  };
}
