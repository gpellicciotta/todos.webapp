/**
 * Inbox view: the bell button with its popover panel, and the broadcast banners above the views (`NTF-1` to `NTF-5`).
 *
 * The bell sits before the user button, shows the unread count in a badge, and appears only while connected,
 * so local mode shows nothing of it (`LOC-1`). Its panel lists the notifications, most recent first, each with
 * Open for a safe action link, Mark read while unread, and Discard; Clear all discards every one.
 * An unread notification that asks for a banner also shows a banner with Dismiss, which marks it read.
 * A change the service does not accept leaves the view as it was and shows a toast.
 * All texts come from the service, so they render as text only.
 */

import { actionLink } from '../sync/inbox.js';
import { anchorPanel } from '../../vendor/design/js/anchor.js';
import { attachPopover } from '../../vendor/design/js/popover.js';

const ICONS = 'img/icons.svg';
const MAX_BADGE = 99;

/** Inbox strings, for the strings module of TEC-13 to absorb. */
export const INBOX_STRINGS = Object.freeze({
  button: 'Inbox',
  buttonUnread: (count) => `Inbox, ${count} unread`,
  title: 'Inbox',
  empty: 'No notifications',
  offline: 'Offline. Showing the last inbox.',
  clearAll: 'Clear all',
  open: 'Open',
  markRead: 'Mark read',
  discard: 'Discard',
  dismissText: 'Dismiss',
  dismiss: (title) => `Dismiss ${title}`,
  failed: 'The service could not be reached. Try again.',
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
 * Create the Open link of a notification.
 * @param {Document} doc the document
 * @param {string} href the address
 * @returns {HTMLAnchorElement} the link
 */
function openLink(doc, href) {
  const link = make(doc, 'a', 'button button--secondary', INBOX_STRINGS.open);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
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
 * Build the inbox view and keep it current with the inbox and the session.
 * @param {HTMLElement} slot the element the bell and its panel go into, such as the end of the top bar
 * @param {object} options the dependencies
 * @param {object} options.inbox the inbox
 * @param {object} options.session the session
 * @param {HTMLElement} options.banners the element the broadcast banners go into
 * @param {{show: (message: string) => void}} options.toaster the toaster
 * @param {(message: string) => void} options.announce speaks a message through the polite live region
 * @returns {{destroy: () => void}} the controller
 */
export function attachInbox(slot, { inbox, session, banners, toaster, announce }) {
  const doc = slot.ownerDocument;
  const announced = new Set();

  const button = make(doc, 'button', 'icon-button inbox-button');
  button.type = 'button';
  button.title = INBOX_STRINGS.button;
  button.append(icon(doc, 'bell'));

  const panel = make(doc, 'div', 'popover inbox-panel');
  panel.id = 'inbox-panel';
  panel.tabIndex = -1;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', INBOX_STRINGS.title);
  const header = make(doc, 'div', 'inbox-panel__header');
  const heading = make(doc, 'h2', 'inbox-panel__title', INBOX_STRINGS.title);
  const clearAll = actionButton(doc, INBOX_STRINGS.clearAll, 'clear-all');
  header.append(heading, clearAll);
  const note = make(doc, 'p', 'inbox-panel__note', INBOX_STRINGS.offline);
  const list = make(doc, 'ul', 'inbox-list');
  const empty = make(doc, 'p', 'inbox-panel__empty', INBOX_STRINGS.empty);
  panel.append(header, note, list, empty);
  slot.prepend(button, panel);
  const popover = attachPopover(button, panel, { align: 'end' });

  /**
   * Run a change; a refusal shows a toast.
   * @param {Promise<boolean>} change the change
   */
  async function settle(change) {
    if (!(await change)) {
      toaster.show(INBOX_STRINGS.failed);
    }
  }

  /**
   * Build the row of a notification.
   * @param {object} item the notification
   * @returns {HTMLLIElement} the row
   */
  function row(item) {
    const element = make(doc, 'li', 'inbox-item');
    element.dataset.id = String(item.id);
    element.dataset.read = String(item.read);
    element.dataset.type = item.type;
    const time = make(doc, 'time', 'inbox-item__time', formatTime(item.creationTime));
    if (item.creationTime) {
      time.dateTime = item.creationTime;
    }
    const actions = make(doc, 'div', 'inbox-item__actions');
    const href = actionLink(item, session.account()?.server);
    if (href) {
      actions.append(openLink(doc, href));
    }
    if (!item.read) {
      actions.append(actionButton(doc, INBOX_STRINGS.markRead, 'read'));
    }
    actions.append(actionButton(doc, INBOX_STRINGS.discard, 'discard'));
    element.append(
      ...(item.title ? [make(doc, 'p', 'inbox-item__title', item.title)] : []),
      make(doc, 'p', 'inbox-item__message', item.message), time, actions,
    );
    return element;
  }

  /**
   * Keep focus inside the open panel when a rebuild removed the focused control.
   * @param {string|null} id the identifier of the row that held focus
   * @param {string|null} action the action of the focused control
   */
  function restoreFocus(id, action) {
    const target = (id && (panel.querySelector(`[data-id="${id}"] [data-action="${action}"]`)
      ?? panel.querySelector(`[data-id="${id}"] button`)))
      || (id && list.querySelector('[data-action]'))
      || (!clearAll.disabled ? clearAll : panel);
    target.focus();
  }

  /** Show the unread count on the bell, and hide the bell without a connection. */
  function renderButton() {
    const unread = inbox.unreadCount();
    button.hidden = session.state() !== 'connected';
    button.setAttribute('aria-label', unread > 0 ? INBOX_STRINGS.buttonUnread(unread) : INBOX_STRINGS.button);
    button.querySelector('.inbox-button__badge')?.remove();
    if (unread > 0) {
      button.append(make(doc, 'span', 'inbox-button__badge', unread > MAX_BADGE ? `${MAX_BADGE}+` : String(unread)));
    }
    if (button.hidden) {
      popover.close('close');
    }
  }

  /** Rebuild the rows of the panel. */
  function renderPanel() {
    const focused = doc.activeElement && panel.contains(doc.activeElement) ? doc.activeElement : null;
    const id = focused?.closest('[data-id]')?.dataset.id ?? null;
    const action = focused?.dataset.action ?? null;
    const items = inbox.list();
    list.replaceChildren(...items.map(row));
    empty.hidden = items.length > 0;
    clearAll.disabled = items.length === 0;
    note.hidden = inbox.status() !== 'offline';
    if (popover.isOpen()) {
      anchorPanel(panel, button, undefined, 'end');
      if (focused && !focused.isConnected) {
        restoreFocus(id, action);
      }
    }
  }

  /** Show a banner for each unread notification that asks for one, announcing the new ones. */
  function renderBanners() {
    const items = session.state() === 'connected' ? inbox.banners() : [];
    banners.replaceChildren(...items.map((item) => {
      const text = make(doc, 'p', 'banner__text');
      if (item.title) {
        text.append(make(doc, 'strong', 'banner__title', item.title), doc.createTextNode(' '));
      }
      text.append(doc.createTextNode(item.message));
      const banner = make(doc, 'div', 'banner');
      banner.dataset.id = String(item.id);
      banner.append(icon(doc, 'alert', 'icon banner__icon'), text);
      const href = actionLink(item, session.account()?.server);
      if (href) {
        banner.append(openLink(doc, href));
      }
      const dismiss = actionButton(doc, INBOX_STRINGS.dismissText, 'dismiss');
      dismiss.setAttribute('aria-label', INBOX_STRINGS.dismiss(item.title ?? item.message));
      banner.append(dismiss);
      return banner;
    }));
    for (const item of items) {
      if (!announced.has(item.id)) {
        announced.add(item.id);
        announce(item.title ? `${item.title}. ${item.message}` : item.message);
      }
    }
  }

  /** Bring the whole view up to date. */
  function render() {
    renderButton();
    renderPanel();
    renderBanners();
  }

  panel.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    const id = Number(target?.closest('[data-id]')?.dataset.id);
    if (target?.dataset.action === 'read') {
      settle(inbox.markRead(id));
    }
    else if (target?.dataset.action === 'discard') {
      settle(inbox.discard(id));
    }
    else if (target?.dataset.action === 'clear-all') {
      settle(inbox.clearAll());
    }
  });
  banners.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="dismiss"]');
    if (target) {
      settle(inbox.markRead(Number(target.closest('[data-id]').dataset.id)));
    }
  });
  const stopInbox = inbox.subscribe(render);
  const stopSession = session.subscribe(render);
  render();

  return {
    /** Stop following the inbox and remove the bell, the panel, and the banners. */
    destroy() {
      stopInbox();
      stopSession();
      popover.destroy();
      button.remove();
      panel.remove();
      banners.replaceChildren();
    },
  };
}
