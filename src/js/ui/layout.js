/**
 * App shell layout: the top bar, the sidebar, the main column, the editor panel slot, and the bottom bar.
 *
 * Both layouts live in one DOM; app-shell.css shows the compact one below 64rem and the wide one from 64rem.
 * Each route gets an empty `[data-view]` element in the main column for its screen to fill.
 * The current route is marked with `aria-current="page"` in the sidebar and the bottom bar.
 * The theme follows the system unless the device stores a preference, which `data-theme` applies.
 */

import { readTheme } from '../core/preferences.js';
import { attachMenu } from './menu.js';

const ICONS = 'img/icons.svg';
const OPEN = ['todo', 'in-progress'];

/** Shell strings, for the strings module of TEC-13 to absorb. */
export const STRINGS = Object.freeze({
  app: "ToDo's",
  main: 'Main',
  more: 'More actions',
  newList: 'New list',
  openTasks: ' open tasks',
  lists: 'Lists',
  localOnly: 'Local only',
  syncState: 'Sync state: ',
  titles: Object.freeze({
    tasks: 'All tasks', lists: 'Lists', list: 'List', bin: 'Recycle bin',
    settings: 'Settings', 'sync-log': 'Sync log', connect: 'Connect',
  }),
});

/** Destinations of both navigation bars: a sidebar label and a shorter bottom bar label. */
const DESTINATIONS = [
  { key: 'tasks', hash: '#/tasks', icon: 'tasks', label: 'All tasks', short: 'Tasks', count: true },
  { key: 'lists', hash: '#/lists', icon: 'lists', label: 'Lists', short: 'Lists' },
  { key: 'bin', hash: '#/bin', icon: 'bin', label: 'Recycle bin', short: 'Bin' },
  { key: 'settings', hash: '#/settings', icon: 'settings', label: 'Settings', short: 'Settings' },
];

/** Navigation destination of each view. */
const NAV_OF_VIEW = { tasks: 'tasks', lists: 'lists', list: 'lists', bin: 'bin', settings: 'settings', 'sync-log': 'settings', connect: 'settings' };

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
 * Return the markup of the sync indicator in its local state, linking to the connect flow.
 * @returns {string} the markup
 */
function syncIndicator() {
  return `<a class="sync-indicator" href="#/connect" data-state="local">${icon('sync-local')}`
    + `<span class="visually-hidden">${STRINGS.syncState}</span><span class="sync-indicator__label">${STRINGS.localOnly}</span></a>`;
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
 * Count open tasks, in all and per list.
 * @param {object[]} tasks the tasks outside the recycle bin
 * @param {object[]} memberships the membership records
 * @returns {{all: number, byList: Map<string, number>}} the open counts
 */
export function openCounts(tasks, memberships) {
  const open = new Set(tasks.filter((task) => OPEN.includes(task.status)).map((task) => task.id));
  const byList = new Map();
  for (const membership of memberships) {
    if (open.has(membership['task-id'])) {
      byList.set(membership['list-id'], (byList.get(membership['list-id']) ?? 0) + 1);
    }
  }
  return { all: open.size, byList };
}

/**
 * Render the app shell into a root element.
 * @param {HTMLElement} root the element that holds the shell
 * @param {object} options shell options
 * @param {(hash: string) => void} options.navigate opens a route, for the More menu
 * @returns {{main: HTMLElement, editor: HTMLElement, toastRegion: HTMLElement, update: Function,
 *   setLists: Function, showBanner: Function, showNotice: Function}} the shell controller
 */
export function renderShell(root, { navigate }) {
  const doc = root.ownerDocument;
  root.classList.add('app');
  root.innerHTML = `
    <header class="app__top-bar">
      <h1 class="app__title" id="app-title"></h1>
      ${syncIndicator()}
      <button class="icon-button app__more" type="button" aria-label="${STRINGS.more}">${icon('more')}</button>
      <div class="menu" aria-label="${STRINGS.more}" hidden>
        <button class="menu__item" type="button" role="menuitem" data-hash="#/lists/new">${icon('plus')}${STRINGS.newList}</button>
      </div>
    </header>
    <nav class="sidebar app__sidebar" aria-label="${STRINGS.main}">
      <p class="sidebar__brand">${STRINGS.app}</p>
      <ul class="nav-list">${DESTINATIONS.slice(0, 2).map(sidebarItem).join('')}</ul>
      <ul class="nav-list" aria-label="${STRINGS.lists}" data-nav-lists></ul>
      <a class="button button--quiet sidebar__new-list" href="#/lists/new">${icon('plus')}${STRINGS.newList}</a>
      <ul class="nav-list sidebar__end">${DESTINATIONS.slice(2).map(sidebarItem).join('')}</ul>
      <div class="sidebar__footer">${syncIndicator()}</div>
    </nav>
    <main class="app__main" id="main" tabindex="-1" aria-labelledby="app-title"><div class="app__banners"></div></main>
    <div class="app__editor" data-editor-slot hidden></div>
    <nav class="bottom-nav app__bottom-nav" aria-label="${STRINGS.main}">
      <ul class="bottom-nav__list">${DESTINATIONS.map((destination) => `<li><a class="bottom-nav__item" href="${destination.hash}" `
        + `data-nav="${destination.key}">${icon(destination.icon)}${destination.short}</a></li>`).join('')}</ul>
    </nav>
    <div class="toast-region" role="region" aria-label="Notifications"></div>`;

  const title = root.querySelector('#app-title');
  const main = root.querySelector('.app__main');
  const banners = root.querySelector('.app__banners');
  const editor = root.querySelector('[data-editor-slot]');
  const listNav = root.querySelector('[data-nav-lists]');
  const more = root.querySelector('.app__more');
  attachMenu(more, more.nextElementSibling, { onSelect: (item) => navigate(item.dataset.hash) });
  let viewKey = null;
  let route = null;
  let view = null;

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
     * Show the lists in the sidebar, each with its open task count.
     * @param {object[]} lists the lists outside the recycle bin, in display order
     * @param {{all: number, byList: Map<string, number>}} counts the open counts
     */
    setLists(lists, counts) {
      setCount(root.querySelector('[data-count="all"]'), counts.all);
      listNav.replaceChildren(...lists.map((list) => {
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
        setCount(count, counts.byList.get(list.id) ?? 0);
        link.append(label, count);
        item.append(link);
        return item;
      }));
      markCurrent();
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
     * @param {string} message the message
     * @param {{actionLabel: string, onAction: () => void}} [action] a button in the banner
     */
    showNotice(message, action) {
      const banner = doc.createElement('div');
      banner.className = 'banner';
      banner.setAttribute('role', 'status');
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
      banners.replaceChildren(banner);
    },
  };
}
