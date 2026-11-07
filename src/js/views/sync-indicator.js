/**
 * Sync indicator: the button before the bell and the user button, its popover, and the session banner (`SYN-4`, `SYN-11`).
 *
 * It shows one of seven states, each with an icon and a text label: Local only, Synced, Syncing, Offline with the
 * pending count, Sign in needed, Sync error, and Update required. The engine and the session decide the state.
 * A dot marks sync log entries newer than the last visit to the Sync log (`SYN-8`).
 * The popover shows the state, the last sync time, and a Sync now button, which becomes Retry after an error.
 * Update required names the minimum version and offers Check for update; Local only offers Connect; Sign in needed offers Sign in.
 * While the session needs a new sign-in, a banner above the views offers Sign in too (`CON-13`).
 * A changed state is announced through the polite live region, except Syncing, which comes and goes with every run.
 */

import { anchorPanel, attachPopover } from '../ui/popover.js';

const ICONS = 'img/icons.svg';
const LOG_HASH = '#/settings/sync-log';
const CONNECT_HASH = '#/connect';

/** Indicator strings, for the strings module of TEC-13 to absorb. */
export const SYNC_STRINGS = Object.freeze({
  prefix: 'Sync state: ',
  newEntries: ', new sync log entries',
  panel: 'Sync',
  labels: Object.freeze({
    'local-only': 'Local only',
    synced: 'Synced',
    syncing: 'Syncing',
    offline: 'Offline',
    'sign-in-needed': 'Sign in needed',
    error: 'Sync error',
    'update-required': 'Update required',
  }),
  offline: (pending) => (pending > 0 ? `Offline · ${pending} pending` : 'Offline'),
  localText: 'Your data stays on this device.',
  syncedAt: (time) => `Last synced ${time}`,
  notSynced: 'Not synced yet.',
  syncingText: 'Syncing your changes…',
  pending: (count) => `${count} ${count === 1 ? 'change waits' : 'changes wait'} to sync.`,
  offlineText: 'You are offline. Changes sync when the connection returns.',
  errorText: 'Syncing failed. It will try again.',
  signInText: 'Your session expired. Your changes stay on this device until you sign in again.',
  updateText: (minimum) => (minimum ? `Version ${minimum} or newer is required to sync.` : 'A newer version of the app is required to sync.'),
  sessionExpired: 'Your session expired. Your changes stay on this device until you sign in again.',
  syncNow: 'Sync now',
  retry: 'Retry',
  checkUpdate: 'Check for update',
  connect: 'Connect',
  signIn: 'Sign in',
  syncLog: 'Sync log',
});

/** The look of each state: the `data-state` the style sheet knows and the icon. */
const LOOKS = Object.freeze({
  'local-only': { state: 'local', icon: 'sync-local' },
  synced: { state: 'synced', icon: 'sync-synced' },
  syncing: { state: 'syncing', icon: 'sync-syncing' },
  offline: { state: 'offline', icon: 'sync-offline' },
  'sign-in-needed': { state: 'sign-in', icon: 'sync-sign-in' },
  error: { state: 'error', icon: 'sync-error' },
  'update-required': { state: 'update-required', icon: 'alert' },
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
 * Create a decorative sprite icon.
 * @param {Document} doc the document
 * @param {string} id the symbol identifier
 * @param {string} [className] the classes
 * @returns {SVGElement} the icon
 */
function icon(doc, id, className = 'icon') {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = doc.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `${ICONS}#${id}`);
  svg.append(use);
  return svg;
}

/**
 * Create a button.
 * @param {Document} doc the document
 * @param {string} label the text
 * @param {string} action the `data-action` value
 * @returns {HTMLButtonElement} the button
 */
function actionButton(doc, label, action) {
  const button = make(doc, 'button', 'button button--secondary', label);
  button.type = 'button';
  button.dataset.action = action;
  return button;
}

/**
 * Create a link styled as a button.
 * @param {Document} doc the document
 * @param {string} label the text
 * @param {string} href the address
 * @param {string} [variant] the button variant class
 * @returns {HTMLAnchorElement} the link
 */
function linkButton(doc, label, href, variant = 'button--secondary') {
  const link = make(doc, 'a', `button ${variant}`, label);
  link.href = href;
  return link;
}

/**
 * Format a time in the device timezone (`TEC-14`).
 * @param {string|null} iso the ISO time
 * @returns {string} the text, empty without a valid time
 */
function formatTime(iso) {
  const date = new Date(iso ?? '');
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/**
 * Build the sync indicator and keep it current with the engine, the session, and the sync log.
 * @param {HTMLElement} slot the element the button and its panel go into, such as the end of the top bar
 * @param {object} options the dependencies
 * @param {{state: Function, subscribe: Function, syncNow: Function}} options.engine the sync engine
 * @param {object} options.session the session
 * @param {() => Promise<object[]>} options.readLog reads the sync log records
 * @param {{get: () => string|null, subscribe: Function}} options.seen the marker of the last visit to the Sync log
 * @param {HTMLElement} [options.banners] the element the session banner goes into
 * @param {(message: string) => void} [options.announce] speaks a message through the polite live region
 * @param {() => void} [options.checkForUpdate] asks the browser for a new service worker
 * @returns {{refresh: () => void, destroy: () => void}} the controller
 */
export function attachSyncIndicator(slot, { engine, session, readLog, seen, banners, announce = () => {}, checkForUpdate = () => {} }) {
  const doc = slot.ownerDocument;
  let unseen = false;
  let shown = null;
  let running = false;
  let destroyed = false;
  let reading = 0;

  const button = make(doc, 'button', 'sync-indicator');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  const label = make(doc, 'span', 'sync-indicator__label');
  const panel = make(doc, 'div', 'popover sync-panel');
  panel.id = 'sync-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', SYNC_STRINGS.panel);
  slot.prepend(button, panel);
  const popover = attachPopover(button, panel, { align: 'end', onOpen: () => button.setAttribute('aria-expanded', 'true'), onClose: () => button.setAttribute('aria-expanded', 'false') });

  /** @returns {{status: string, text: string, state: object}} the status the session and the engine give, its label, and the engine state */
  function describe() {
    const state = engine.state();
    const connection = session.state();
    let status = state.status;
    if (connection === 'local') {
      status = 'local-only';
    }
    else if (connection === 'sign-in-needed') {
      status = 'sign-in-needed';
    }
    return { status, text: status === 'offline' ? SYNC_STRINGS.offline(state.pending) : SYNC_STRINGS.labels[status], state };
  }

  /**
   * Fill the panel for a state.
   * @param {{status: string, state: object}} view the status and the engine state
   */
  function renderPanel({ status, state }) {
    const lines = [make(doc, 'p', 'sync-panel__state', SYNC_STRINGS.labels[status])];
    const actions = make(doc, 'div', 'sync-panel__actions');
    const time = make(doc, 'p', 'sync-panel__time');
    switch (status) {
      case 'local-only':
        time.textContent = SYNC_STRINGS.localText;
        actions.append(linkButton(doc, SYNC_STRINGS.connect, CONNECT_HASH, ''));
        break;
      case 'synced':
        time.textContent = state.lastSync ? SYNC_STRINGS.syncedAt(formatTime(state.lastSync)) : SYNC_STRINGS.notSynced;
        actions.append(actionButton(doc, SYNC_STRINGS.syncNow, 'sync-now'));
        break;
      case 'syncing':
        time.textContent = SYNC_STRINGS.syncingText;
        break;
      case 'offline':
        time.textContent = state.pending > 0 ? SYNC_STRINGS.pending(state.pending) : SYNC_STRINGS.offlineText;
        actions.append(actionButton(doc, SYNC_STRINGS.syncNow, 'sync-now'));
        break;
      case 'error':
        time.textContent = state.error || SYNC_STRINGS.errorText;
        actions.append(actionButton(doc, SYNC_STRINGS.retry, 'retry'));
        break;
      case 'sign-in-needed':
        time.textContent = SYNC_STRINGS.signInText;
        actions.append(linkButton(doc, SYNC_STRINGS.signIn, CONNECT_HASH, ''));
        break;
      default:
        time.textContent = SYNC_STRINGS.updateText(state.minimum);
        actions.append(actionButton(doc, SYNC_STRINGS.checkUpdate, 'check-update'));
    }
    lines.push(time);
    if (status !== 'local-only') {
      actions.append(linkButton(doc, SYNC_STRINGS.syncLog, LOG_HASH));
    }
    panel.replaceChildren(...lines, actions);
    for (const control of panel.querySelectorAll('[data-action="sync-now"], [data-action="retry"]')) {
      control.disabled = running;
    }
  }

  /** Show the session banner while the session needs a new sign-in. */
  function renderBanner() {
    if (!banners) {
      return;
    }
    if (session.state() !== 'sign-in-needed') {
      banners.replaceChildren();
      return;
    }
    if (banners.childElementCount > 0) {
      return;
    }
    const banner = make(doc, 'div', 'banner');
    banner.append(icon(doc, 'alert', 'icon banner__icon'), make(doc, 'p', 'banner__text', SYNC_STRINGS.sessionExpired), linkButton(doc, SYNC_STRINGS.signIn, CONNECT_HASH));
    banners.replaceChildren(banner);
    announce(SYNC_STRINGS.sessionExpired);
  }

  /** Bring the button, the panel, and the banner up to date. */
  function render() {
    if (destroyed) {
      return;
    }
    const view = describe();
    const look = LOOKS[view.status] ?? LOOKS.error;
    button.dataset.state = look.state;
    button.replaceChildren(icon(doc, look.icon), make(doc, 'span', 'visually-hidden', SYNC_STRINGS.prefix), label);
    if (view.status === 'offline' && view.state.pending > 0) {
      label.replaceChildren(doc.createTextNode('Offline · '), make(doc, 'span', 'sync-indicator__count', String(view.state.pending)), doc.createTextNode(' pending'));
    }
    else {
      label.textContent = view.text;
    }
    if (unseen) {
      button.append(make(doc, 'span', 'sync-indicator__dot'), make(doc, 'span', 'visually-hidden', SYNC_STRINGS.newEntries));
    }
    renderPanel(view);
    renderBanner();
    if (popover.isOpen()) {
      anchorPanel(panel, button, undefined, 'end');
    }
    if (shown !== null && shown !== view.status && view.status !== 'syncing') {
      announce(view.text);
    }
    shown = view.status;
  }

  /** Read the sync log, and show the dot while an entry is newer than the last visit. */
  async function readUnseen() {
    const ticket = ++reading;
    let records = [];
    try {
      records = await readLog();
    }
    catch (error) {
      console.error('Reading the sync log failed:', error);
    }
    if (destroyed || ticket !== reading) {
      return;
    }
    const mark = seen.get();
    const next = records.some((record) => mark === null || record.time > mark);
    if (next !== unseen) {
      unseen = next;
      render();
    }
  }

  /** Follow a change of the engine or the session. */
  function refresh() {
    render();
    readUnseen();
  }

  /**
   * Run the engine now, keeping the buttons off meanwhile.
   * @returns {Promise<void>}
   */
  async function run() {
    running = true;
    render();
    try {
      await engine.syncNow();
    }
    catch (error) {
      console.error('Sync failed:', error);
    }
    finally {
      running = false;
      refresh();
    }
  }

  button.addEventListener('click', refresh);
  panel.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'sync-now' || action === 'retry') {
      run();
    }
    else if (action === 'check-update') {
      checkForUpdate();
    }
    else if (event.target.closest('a')) {
      popover.close('select');
    }
  });
  const stops = [engine.subscribe(refresh), session.subscribe(refresh), seen.subscribe(() => readUnseen())];
  render();
  readUnseen();

  return {
    refresh,

    /** Stop following the engine, the session, and the log, and remove the button, the panel, and the banner. */
    destroy() {
      destroyed = true;
      stops.forEach((stop) => stop());
      button.removeEventListener('click', refresh);
      popover.destroy();
      button.remove();
      panel.remove();
      banners?.replaceChildren();
    },
  };
}
