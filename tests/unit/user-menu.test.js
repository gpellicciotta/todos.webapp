// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../../src/js/sync/session.js';
import { attachUserMenu, initialsOf } from '../../src/js/ui/user-menu.js';
import { setSpriteUrl } from '../../src/vendor/design/js/icon.js';
import { isShowing, lightDismiss, nextTask } from './popover-shim.js';

const NOW = Date.UTC(2026, 10, 6, 9, 0, 0);
const ACCOUNT = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Ada Lovelace', email: 'ada@example.com', server: 'https://todos.example.com' };
const SPRITE = 'vendor/design/looks/neutral/icons.svg';

/**
 * Create an in-memory storage stand-in.
 * @returns {Storage} the storage
 */
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

/**
 * Mount a user menu over a session that holds a record, or none for local mode.
 * @param {object|null} record the stored session record
 * @returns {{slot: HTMLElement, session: object, menu: object}} the parts
 */
function mount(record = null) {
  const storage = memoryStorage();
  if (record) {
    storage.setItem('todos.session', JSON.stringify(record));
  }
  const session = createSession({ getStorage: () => storage, now: () => NOW, fetch: async () => ({ ok: true, status: 204 }) });
  const slot = document.body.appendChild(document.createElement('div'));
  const menu = attachUserMenu(slot, { session });
  return { slot, session, menu };
}

/**
 * Find the parts of the account menu in a slot.
 * @param {HTMLElement} slot the slot
 * @returns {{button: HTMLElement, panel: HTMLElement, items: HTMLElement[]}} the parts
 */
function parts(slot) {
  const panel = slot.querySelector('.account-menu > .account-menu__panel');
  return { button: slot.querySelector('.account-menu > .account-menu__button'), panel, items: [...panel.querySelectorAll('[role="menuitem"]')] };
}

/**
 * Click an element.
 * @param {Element} target the element
 */
function click(target) {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

beforeAll(() => {
  setSpriteUrl(SPRITE);
});

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('initialsOf', () => {
  it('takes the first letters of the first and last word', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL');
    expect(initialsOf('ada king lovelace')).toBe('AL');
  });

  it('takes one letter from a single word or an email address', () => {
    expect(initialsOf('Ada')).toBe('A');
    expect(initialsOf('ada@example.com')).toBe('A');
  });

  it('keeps a letter outside the basic plane whole', () => {
    expect(initialsOf('𝒜da')).toBe('𝒜');
  });
});

describe('attachUserMenu in local mode', () => {
  it('builds the vendored account menu skeleton in the slot', () => {
    const { slot } = mount();
    const { button, panel } = parts(slot);
    expect(slot.classList.contains('user-menu')).toBe(true);
    expect(slot.querySelector('.account-menu').hasAttribute('data-account-menu')).toBe(true);
    expect(button.tagName).toBe('BUTTON');
    expect(panel.classList.contains('menu')).toBe(true);
    expect(panel.getAttribute('role')).toBe('menu');
    expect(panel.hasAttribute('popover')).toBe(true);
    expect(panel.getAttribute('aria-labelledby')).toBe(panel.querySelector('.account-menu__name').id);
  });

  it('shows a person icon named Local User, with Local User as the hover text', () => {
    const { slot } = mount();
    const { button } = parts(slot);
    expect(button.title).toBe('Local User');
    expect(button.getAttribute('aria-label')).toBe('Local User');
    expect(button.querySelector('.avatar.avatar--sm svg use').getAttribute('href')).toBe(`${SPRITE}#icon-user`);
    expect(button.textContent.trim()).toBe('');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the menu closed and holds no Sign in button', () => {
    const { slot } = mount();
    expect(isShowing(parts(slot).panel)).toBe(false);
    expect(slot.querySelector('.user-menu__sign-in')).toBeNull();
  });

  it('opens a menu with the name, Local only, Recycle bin, and Settings', () => {
    const { slot } = mount();
    const { button, panel, items } = parts(slot);
    click(button);
    expect(isShowing(panel)).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(panel.querySelector('.account-menu__name').textContent).toBe('Local User');
    expect(items.map((item) => [item.textContent.trim(), item.getAttribute('href'), item.dataset.nav])).toEqual([
      ['Local only', '#/connect', 'connect'],
      ['Recycle bin', '#/bin', 'bin'],
      ['Settings', '#/settings', 'settings'],
    ]);
    expect(document.activeElement).toBe(items[0]);
  });

  it('shows each item as a menu item with its icon from the look sprite', () => {
    const { slot } = mount();
    const { items } = parts(slot);
    for (const item of items) {
      expect(item.classList.contains('menu__item')).toBe(true);
      expect(item.classList.contains('button')).toBe(false);
    }
    expect(items.map((item) => item.querySelector('svg.icon use').getAttribute('href'))).toEqual([
      `${SPRITE}#icon-sync-local`, `${SPRITE}#icon-bin`, `${SPRITE}#icon-settings`,
    ]);
  });

  it('closes on Escape, on a light dismiss, and when an item is chosen', async () => {
    const { slot } = mount();
    const { button, panel, items } = parts(slot);
    click(button);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(isShowing(panel)).toBe(false);
    await nextTask();
    click(button);
    lightDismiss(panel);
    await nextTask();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    click(button);
    items[1].addEventListener('click', (event) => event.preventDefault());
    click(items[1]);
    expect(isShowing(panel)).toBe(false);
  });
});

describe('attachUserMenu face', () => {
  it('keeps the same face across opens, so the icon does not reload', () => {
    const { slot } = mount();
    const { button } = parts(slot);
    const face = button.firstElementChild;
    click(button);
    click(button);
    expect(button.firstElementChild).toBe(face);
  });
});

describe('attachUserMenu when connected', () => {
  it('shows the initials, and the account name as the hover text', () => {
    const { slot } = mount(ACCOUNT);
    const { button } = parts(slot);
    expect(button.querySelector('.avatar--initials').textContent).toBe('AL');
    expect(button.title).toBe('Ada Lovelace');
    expect(button.getAttribute('aria-label')).toBe('Ada Lovelace');
    expect(slot.querySelector('.user-menu__sign-in')).toBeNull();
  });

  it('names the account and says Connected in the menu', () => {
    const { slot } = mount(ACCOUNT);
    const { panel, items } = parts(slot);
    expect(panel.querySelector('.account-menu__name').textContent).toBe('Ada Lovelace');
    expect(items.map((item) => item.textContent.trim())).toEqual(['Connected', 'Recycle bin', 'Settings']);
    expect(items[0].querySelector('use').getAttribute('href')).toBe(`${SPRITE}#icon-sync-synced`);
  });

  it('falls back to the email address when the account has no name', () => {
    const { slot } = mount({ ...ACCOUNT, name: null });
    const { button, panel } = parts(slot);
    expect(button.textContent.trim()).toBe('A');
    expect(button.title).toBe('ada@example.com');
    expect(panel.querySelector('.account-menu__name').textContent).toBe('ada@example.com');
  });
});

describe('attachUserMenu when the session expired', () => {
  const EXPIRED = { ...ACCOUNT, expiry: '2000-01-01T00:00:00Z' };

  it('holds no Sign in button, since the session banner of the sync indicator offers it', () => {
    const { slot } = mount(EXPIRED);
    expect(slot.querySelector('.user-menu__sign-in')).toBeNull();
  });

  it('keeps the account name, says Sign in needed, and keeps Recycle bin and Settings', () => {
    const { slot } = mount(EXPIRED);
    const { button, items } = parts(slot);
    expect(button.title).toBe('Ada Lovelace');
    expect(items.map((item) => [item.textContent.trim(), item.getAttribute('href')])).toEqual([
      ['Sign in needed', '#/connect'], ['Recycle bin', '#/bin'], ['Settings', '#/settings'],
    ]);
    expect(items[0].querySelector('use').getAttribute('href')).toBe(`${SPRITE}#icon-sync-sign-in`);
  });
});

describe('attachUserMenu session changes', () => {
  it('re-renders the status item when the session expires', () => {
    const { slot, session } = mount(ACCOUNT);
    session.expire();
    expect(slot.querySelector('.user-menu__sign-in')).toBeNull();
    expect(parts(slot).items[0].textContent.trim()).toBe('Sign in needed');
  });

  it('re-renders when the device disconnects, and keeps the same items', async () => {
    const { slot, session } = mount(ACCOUNT);
    const before = parts(slot).items;
    await session.disconnect();
    const { button, items } = parts(slot);
    expect(button.title).toBe('Local User');
    expect(items[0].textContent.trim()).toBe('Local only');
    expect(items).toHaveLength(before.length);
    items.forEach((item, index) => expect(item).toBe(before[index]));
  });

  it('stops following the session and removes the menu after destroy', () => {
    const { slot, session, menu } = mount(ACCOUNT);
    const unsubscribe = vi.fn();
    const subscribe = session.subscribe;
    const next = attachUserMenu(slot, { session: { ...session, subscribe: (listener) => {
      const stop = subscribe(listener);
      return () => {
        unsubscribe();
        stop();
      };
    } } });
    menu.destroy();
    next.destroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(slot.querySelector('.account-menu')).toBeNull();
    expect(slot.classList.contains('user-menu')).toBe(false);
  });

  it('shows a name made only of spaces as the email address', () => {
    const { slot } = mount({ ...ACCOUNT, name: '   ' });
    const { button } = parts(slot);
    expect(button.textContent.trim()).toBe('A');
    expect(button.title).toBe('ada@example.com');
  });
});
