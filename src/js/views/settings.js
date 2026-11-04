/**
 * Settings screen: Appearance, Data, Connection, and About sections on one page.
 *
 * The theme choice applies at once and persists on this device (`todos.theme`).
 * Export backup and Import backup stay disabled until the backup screens land (`BAK-1`, `BAK-5`).
 * In local mode the Connection section explains connected mode; Connect stays disabled until the connect flow lands.
 * The server URL is kept per device and checked on change (`CON-12`); an empty field restores the default.
 */

import { DEFAULT_SERVER_URL, parseServerUrl, readServerUrl, readTheme, writeServerUrl, writeTheme } from '../core/preferences.js';
import { applyTheme } from '../ui/layout.js';
import { BUILD_DATE, VERSION } from '../version.js';
import { spriteIcon } from './task-list.js';

const SOURCE_URL = 'https://github.com/gpellicciotta/todos.webapp';

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  appearance: 'Appearance',
  theme: 'Theme',
  themes: Object.freeze({ system: 'System', light: 'Light', dark: 'Dark' }),
  data: 'Data',
  exportBackup: 'Export backup',
  importBackup: 'Import backup',
  connection: 'Connection',
  localState: 'Not connected. Your data stays on this device.',
  localHint: 'Connect to sync devices and share lists.',
  connect: 'Connect',
  serverUrl: 'Server URL',
  serverUrlError: `Enter an http or https address, such as ${DEFAULT_SERVER_URL}.`,
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
 * Create a button that stays disabled until its task lands.
 * @param {Document} doc the document
 * @param {string} className the class
 * @param {string} text the label
 * @returns {HTMLButtonElement} the button
 */
function disabledButton(doc, className, text) {
  const button = make(doc, 'button', className, text);
  button.type = 'button';
  button.disabled = true;
  return button;
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
 * @returns {HTMLElement} the section
 */
function appearanceSection(doc, getStorage) {
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
      writeTheme(value, getStorage);
      applyTheme(doc, value);
    });
    option.append(input, doc.createTextNode(label));
    options.append(option);
  }
  element.append(fieldset);
  return element;
}

/**
 * Create the Data section, whose backup buttons stay disabled until the backup screens land.
 * @param {Document} doc the document
 * @returns {HTMLElement} the section
 */
function dataSection(doc) {
  const element = section(doc, 'data', STRINGS.data);
  const actions = make(doc, 'div', 'settings__actions');
  actions.append(disabledButton(doc, 'button button--secondary', STRINGS.exportBackup),
    disabledButton(doc, 'button button--secondary', STRINGS.importBackup));
  element.append(actions);
  return element;
}

/**
 * Create the Connection section of local mode, with the server URL field.
 * @param {Document} doc the document
 * @param {() => Storage} [getStorage] returns the storage of the preference
 * @returns {HTMLElement} the section
 */
function connectionSection(doc, getStorage) {
  const element = section(doc, 'connection', STRINGS.connection);
  const actions = make(doc, 'div', 'settings__actions');
  actions.append(disabledButton(doc, 'button', STRINGS.connect));
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
  element.append(make(doc, 'p', 'settings__text', STRINGS.localState), make(doc, 'p', 'settings__hint', STRINGS.localHint),
    actions, field);
  return element;
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
 * @returns {{update: () => void, destroy: () => void}} the screen
 */
export function mountSettings(view, { getStorage } = {}) {
  const doc = view.ownerDocument;
  const root = make(doc, 'div', 'settings');
  root.append(appearanceSection(doc, getStorage), dataSection(doc), connectionSection(doc, getStorage), aboutSection(doc));
  view.replaceChildren(root);
  return {
    /** Follow a route of this view; Settings has no sub-routes of its own. */
    update() {},

    /** Nothing to stop: the controls go with the view. */
    destroy() {},
  };
}
