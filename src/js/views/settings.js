/**
 * Settings screen: Appearance, Data, Connection, and About sections on one page.
 *
 * The theme choice applies at once and persists on this device (`todos.theme`).
 * Export backup saves the backup file at once and names it in a toast (`BAK-1`, `BAK-4`); Import backup opens its dialog.
 * In local mode the Connection section explains connected mode, and Connect opens the connect screen.
 * The server URL is kept per device and checked on change (`CON-12`); an empty field restores the default.
 * Connected, the section names the account, its server, the sync state, and a Sync log link; the URL cannot change (`CON-11`).
 * Disconnect asks first; with pending changes it offers Sync and disconnect (`CON-7`, `CON-10`, `TEC-18`).
 */

import { backupFileName, exportBackup } from '../core/backup.js';
import { DEFAULT_SERVER_URL, parseServerUrl, readServerUrl, readTheme, writeServerUrl, writeTheme } from '../core/preferences.js';
import { createSession } from '../sync/session.js';
import { confirmDialog } from '../ui/dialog.js';
import { applyTheme } from '../ui/layout.js';
import { BUILD_DATE, VERSION } from '../version.js';
import { openImportDialog, plural } from './import-dialog.js';
import { SYNC_STRINGS } from './sync-indicator.js';
import { spriteIcon } from './task-list.js';

const SOURCE_URL = 'https://github.com/gpellicciotta/todos.webapp';

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  appearance: 'Appearance',
  theme: 'Theme',
  themes: Object.freeze({ system: 'System', light: 'Light', dark: 'Dark' }),
  themeNotSaved: 'The theme could not be saved on this device. It applies until you reload.',
  data: 'Data',
  exportBackup: 'Export backup',
  importBackup: 'Import backup',
  exported: (name, lists, tasks) => `Saved ${name} with ${plural(lists, 'list')} and ${plural(tasks, 'task')}.`,
  exportFailed: 'The backup could not be saved. Try again.',
  connection: 'Connection',
  localState: 'Not connected. Your data stays on this device.',
  localHint: 'Connect to sync devices and share lists.',
  connect: 'Connect',
  signedIn: (account) => (account.name ? `Signed in as ${account.name} (${account.email})` : `Signed in as ${account.email}`),
  server: (url) => `Server: ${url}`,
  syncState: (label) => `Sync state: ${label}`,
  syncLog: 'Sync log',
  expired: 'Your session expired. Your changes stay on this device until you sign in again.',
  signInAgain: 'Sign in again',
  disconnect: 'Disconnect',
  disconnectTitle: 'Disconnect from your account?',
  disconnectText: 'Your own lists and tasks stay on this device. Lists that others shared with you leave it.',
  pending: (count) => `${plural(count, 'change')} did not sync yet.`,
  syncAndDisconnect: 'Sync and disconnect',
  disconnectAnyway: 'Disconnect anyway',
  cancel: 'Cancel',
  disconnected: 'Disconnected. Your data stays on this device.',
  syncFailed: 'The changes could not sync, so you are still connected. Try again.',
  countFailed: 'The pending changes could not be counted, so you are still connected. Try again.',
  serverUrl: 'Server URL',
  serverUrlError: `Enter an https address, or http on this computer, such as ${DEFAULT_SERVER_URL}.`,
  about: 'About',
  version: (version, built) => `Version ${version} · Built ${built}`,
  source: 'Requirements and source code',
});

/**
 * Create an element with a class and optional text.
 * @param {Document} doc the document
 * @param {string} tag the tag name
 * @param {string} className the class
 * @param {string} [text] the text content
 * @returns {HTMLElement} the element
 */
function make(doc, tag, className, text) {
  const element = doc.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

/**
 * Create a settings section with its heading.
 * @param {Document} doc the document
 * @param {string} key the section key, used in identifiers
 * @param {string} title the heading text
 * @returns {HTMLElement} the section
 */
function section(doc, key, title) {
  const element = make(doc, 'section', 'settings__section');
  const heading = make(doc, 'h2', 'settings__title', title);
  heading.id = `settings-${key}`;
  element.setAttribute('aria-labelledby', heading.id);
  element.append(heading);
  return element;
}

/**
 * Create a button.
 * @param {Document} doc the document
 * @param {string} className the class
 * @param {string} text the label
 * @param {() => void} [onClick] the action
 * @returns {HTMLButtonElement} the button
 */
function button(doc, className, text, onClick) {
  const element = make(doc, 'button', className, text);
  element.type = 'button';
  if (onClick) {
    element.addEventListener('click', onClick);
  }
  return element;
}

/**
 * Format the build date as in "4 Nov 2026".
 * @param {string} isoDate the ISO date
 * @returns {string} the date
 */
function formatBuildDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
}

/**
 * Create the Appearance section: the theme as a segmented control that applies at once.
 * @param {Document} doc the document
 * @param {() => Storage} [getStorage] returns the storage of the preference
 * @param {{show: (message: string) => void}} [toaster] reports a theme that could not be saved
 * @returns {HTMLElement} the section
 */
function appearanceSection(doc, getStorage, toaster) {
  const element = section(doc, 'appearance', STRINGS.appearance);
  const fieldset = make(doc, 'fieldset', 'segmented');
  const options = make(doc, 'div', 'segmented__options');
  fieldset.append(make(doc, 'legend', 'visually-hidden', STRINGS.theme), options);
  const current = readTheme(getStorage);
  for (const [value, label] of Object.entries(STRINGS.themes)) {
    const option = make(doc, 'label', 'segmented__option');
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = value;
    input.checked = value === current;
    input.addEventListener('change', () => {
      applyTheme(doc, value);
      if (!writeTheme(value, getStorage)) {
        toaster?.show(STRINGS.themeNotSaved);
      }
    });
    option.append(input, doc.createTextNode(label));
    options.append(option);
  }
  element.append(fieldset);
  return element;
}

/**
 * Save the backup of every stored record as `todos-backup-{{yyyy-mm-dd}}.json`, then name it in a toast.
 * @param {Document} doc the document
 * @param {object} store the store facade
 * @param {{show: (message: string) => void}} [toaster] shows the confirmation
 * @returns {Promise<void>}
 */
async function saveBackup(doc, store, toaster) {
  const now = new Date();
  const backup = await exportBackup(store, { now, appVersion: VERSION });
  const name = backupFileName(now);
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = make(doc, 'a', 'visually-hidden');
  link.href = url;
  link.download = name;
  doc.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toaster?.show(STRINGS.exported(name, backup.lists.length, backup.tasks.length));
}

/**
 * Create the Data section: Export backup and Import backup.
 * @param {Document} doc the document
 * @param {object} store the store facade
 * @param {{show: (message: string) => void}} [toaster] shows the confirmations
 * @param {{session: object, sync?: object}} [connection] the session and the sync engine, for importing while connected
 * @returns {HTMLElement} the section
 */
function dataSection(doc, store, toaster, connection = {}) {
  const element = section(doc, 'data', STRINGS.data);
  const actions = make(doc, 'div', 'settings__actions');
  const exportButton = make(doc, 'button', 'button button--secondary', STRINGS.exportBackup);
  exportButton.type = 'button';
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    try {
      await saveBackup(doc, store, toaster);
    }
    catch (error) {
      console.error('Export failed:', error);
      toaster?.show(STRINGS.exportFailed);
    }
    finally {
      exportButton.disabled = false;
    }
  });
  const importButton = make(doc, 'button', 'button button--secondary', STRINGS.importBackup);
  importButton.type = 'button';
  importButton.addEventListener('click', () => openImportDialog(doc, { store, toaster, opener: importButton, ...connection }));
  actions.append(exportButton, importButton);
  element.append(actions);
  return element;
}

/**
 * Create the server URL field of local mode.
 * @param {Document} doc the document
 * @param {() => Storage} [getStorage] returns the storage of the preference
 * @returns {HTMLElement} the field
 */
function serverField(doc, getStorage) {
  const field = make(doc, 'div', 'field');
  const label = make(doc, 'label', 'field__label', STRINGS.serverUrl);
  label.htmlFor = 'settings-server-url';
  const input = make(doc, 'input', 'field__control');
  Object.assign(input, { id: label.htmlFor, type: 'url', autocomplete: 'url', spellcheck: false, value: readServerUrl(getStorage) });
  const error = make(doc, 'p', 'field__error');
  error.id = 'settings-server-url-error';
  error.hidden = true;
  error.append(spriteIcon(doc, 'alert'), doc.createTextNode(STRINGS.serverUrlError));
  input.addEventListener('change', () => {
    const text = input.value.trim() || DEFAULT_SERVER_URL;
    const url = parseServerUrl(text);
    error.hidden = url !== null;
    if (url === null) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', error.id);
      return;
    }
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    input.value = url;
    writeServerUrl(url, getStorage);
  });
  field.append(label, input, error);
  return field;
}

/**
 * Ask before disconnecting; with pending changes, offer to sync first.
 * @param {Document} doc the document
 * @param {HTMLElement} parent the element that holds the dialog while open
 * @param {HTMLElement} opener the Disconnect button
 * @param {number} pending the count of changes not synced yet
 * @returns {Promise<'sync'|'disconnect'|null>} the choice, or null for Cancel
 */
async function askDisconnect(doc, parent, opener, pending) {
  const dialog = make(doc, 'dialog', 'dialog');
  dialog.setAttribute('aria-labelledby', 'settings-disconnect-title');
  const header = make(doc, 'div', 'dialog__header');
  const title = make(doc, 'h2', 'dialog__title', STRINGS.disconnectTitle);
  title.id = 'settings-disconnect-title';
  header.append(title);
  const body = make(doc, 'div', 'dialog__body');
  body.append(make(doc, 'p', '', STRINGS.disconnectText));
  const actions = make(doc, 'div', 'dialog__actions');
  const choices = [['button--secondary', STRINGS.cancel, 'cancel']];
  if (pending > 0) {
    body.append(make(doc, 'p', '', STRINGS.pending(pending)));
    choices.push(['button--secondary', STRINGS.disconnectAnyway, 'disconnect'], ['', STRINGS.syncAndDisconnect, 'sync']);
  }
  else {
    choices.push(['', STRINGS.disconnect, 'disconnect']);
  }
  for (const [variant, text, value] of choices) {
    const choice = button(doc, `button ${variant}`.trim(), text);
    choice.dataset.dialogClose = value;
    actions.append(choice);
  }
  dialog.append(header, body, actions);
  parent.append(dialog);
  await confirmDialog(dialog, { opener });
  const answer = dialog.returnValue;
  dialog.remove();
  return answer === 'sync' || answer === 'disconnect' ? answer : null;
}

/**
 * Fill the Connection section for the session state, and refill it when the state changes.
 * @param {Document} doc the document
 * @param {object} options the session, the sync hook, the preference storage, the toaster, and `navigate`
 * @returns {{element: HTMLElement, destroy: () => void}} the section
 */
function connectionSection(doc, { getStorage, session, sync, toaster, navigate }) {
  const element = section(doc, 'connection', STRINGS.connection);
  const heading = element.firstChild;

  /**
   * Ask, optionally sync, then disconnect.
   * @param {HTMLElement} opener the Disconnect button
   * @returns {Promise<void>}
   */
  async function disconnect(opener) {
    let pending;
    try {
      pending = (await sync?.pendingCount()) ?? 0;
    }
    catch (error) {
      console.error('Counting pending changes failed:', error);
      toaster?.show(STRINGS.countFailed);
      return;
    }
    const choice = await askDisconnect(doc, element, opener, pending);
    try {
      if (choice === 'sync') {
        await sync.syncNow();
      }
      if (choice) {
        await session.disconnect();
        toaster?.show(STRINGS.disconnected);
      }
    }
    catch (error) {
      console.error('Sync before disconnect failed:', error);
      toaster?.show(STRINGS.syncFailed);
    }
  }

  /** Show the controls of the current state. */
  function render() {
    const state = session.state();
    const account = session.account();
    const actions = make(doc, 'div', 'settings__actions');
    if (state === 'local') {
      actions.append(button(doc, 'button', STRINGS.connect, () => navigate('#/connect')));
      element.replaceChildren(heading, make(doc, 'p', 'settings__text', STRINGS.localState),
        make(doc, 'p', 'settings__hint', STRINGS.localHint), actions, serverField(doc, getStorage));
      return;
    }
    const status = sync?.state?.().status;
    const parts = [make(doc, 'p', 'settings__text', STRINGS.signedIn(account)), make(doc, 'p', 'settings__hint', STRINGS.server(account.server))];
    if (status) {
      parts.push(make(doc, 'p', 'settings__hint settings__sync-state', STRINGS.syncState(SYNC_STRINGS.labels[state === 'sign-in-needed' ? 'sign-in-needed' : status] ?? status)));
    }
    if (state === 'sign-in-needed') {
      parts.push(make(doc, 'p', 'settings__text', STRINGS.expired));
      const again = make(doc, 'a', 'button', STRINGS.signInAgain);
      again.href = '#/connect';
      actions.append(again);
    }
    const leave = button(doc, 'button button--secondary', STRINGS.disconnect, () => disconnect(leave));
    const log = make(doc, 'a', 'button button--secondary', STRINGS.syncLog);
    log.href = '#/settings/sync-log';
    actions.append(log, leave);
    element.replaceChildren(heading, ...parts, actions);
  }

  render();
  const stops = [session.subscribe(render), sync?.subscribe?.(render)];
  return { element, destroy: () => stops.forEach((stop) => stop?.()) };
}

/**
 * Create the About section: the app version, the build date, and the source link.
 * @param {Document} doc the document
 * @returns {HTMLElement} the section
 */
function aboutSection(doc) {
  const element = section(doc, 'about', STRINGS.about);
  const link = make(doc, 'a', 'settings__link', STRINGS.source);
  link.href = SOURCE_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  element.append(make(doc, 'p', 'settings__hint', STRINGS.version(VERSION, formatBuildDate(BUILD_DATE))), link);
  return element;
}

/**
 * Mount the Settings screen into its view element.
 * @param {HTMLElement} view the `[data-view="settings"]` element
 * @param {object} [options] screen options
 * @param {() => Storage} [options.getStorage] returns the storage of the per-device preferences
 * @param {object} [options.store] the store facade, for the backups
 * @param {{show: (message: string) => void}} [options.toaster] shows confirmations and problems
 * @param {object} [options.session] the session, for the Connection section
 * @param {{pendingCount: () => Promise<number>, syncNow: () => Promise<void>, state: () => object, subscribe: Function}} [options.sync] the sync engine
 * @param {(hash: string) => void} [options.navigate] opens a route, setting the location hash by default
 * @returns {{update: () => void, destroy: () => void}} the screen
 */
export function mountSettings(view, {
  getStorage, store, toaster, session = createSession({ getStorage }), sync, navigate = (hash) => {
    view.ownerDocument.defaultView.location.hash = hash;
  },
} = {}) {
  const doc = view.ownerDocument;
  const root = make(doc, 'div', 'settings');
  const connection = connectionSection(doc, { getStorage, session, sync, toaster, navigate });
  root.append(appearanceSection(doc, getStorage, toaster), dataSection(doc, store, toaster, { session, sync }), connection.element, aboutSection(doc));
  view.replaceChildren(root);
  return {
    /** Follow a route of this view; Settings has no sub-routes of its own. */
    update() {},

    /** Stop following the session; the controls go with the view. */
    destroy() {
      connection.destroy();
    },
  };
}
