// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clampWidth, limitsOf } from '../../src/js/ui/panel-resize.js';
import { renderShell } from '../../src/js/ui/layout.js';
import { resetBody } from './dom-reset.js';

const REM = 16;

beforeEach(() => {
  window.innerWidth = 1440;
  vi.stubGlobal('requestAnimationFrame', (callback) => {
    callback();
    return 1;
  });
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetBody();
  localStorage.clear();
});

/**
 * Render the shell and open the editor slot.
 * @param {{open?: boolean}} [options] whether the editor panel is open
 * @returns {{root: HTMLElement, sidebar: HTMLElement, editor: HTMLElement}} the root and both separators
 */
function render({ open = true } = {}) {
  const root = document.body.appendChild(document.createElement('div'));
  const shell = renderShell(root, { navigate: vi.fn() });
  shell.editor.hidden = !open;
  return { root, sidebar: root.querySelector('[data-panel="sidebar"]'), editor: root.querySelector('[data-panel="editor"]') };
}

/**
 * Press a key on an element.
 * @param {HTMLElement} element the target
 * @param {string} key the key
 */
function press(element, key) {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

/**
 * Drag a separator by a horizontal distance.
 * @param {HTMLElement} element the separator
 * @param {number} dx the distance in px
 */
function drag(element, dx) {
  const fire = (type, x) => element.dispatchEvent(new MouseEvent(type, { clientX: x, button: 0, bubbles: true, cancelable: true }));
  fire('pointerdown', 500);
  fire('pointermove', 500 + dx);
  fire('pointerup', 500 + dx);
}

const width = (root, property) => root.style.getPropertyValue(property);

describe('panel limits', () => {
  it('limits the sidebar to 12 to 24rem and the editor to 20 to 40rem', () => {
    expect(clampWidth('sidebar', 5, 0, 100)).toBe(12);
    expect(clampWidth('sidebar', 99, 0, 100)).toBe(24);
    expect(clampWidth('editor', 5, 0, 100)).toBe(20);
    expect(clampWidth('editor', 99, 0, 100)).toBe(40);
  });
  it('keeps 24rem for the main column', () => {
    expect(limitsOf('editor', 16, 70)).toEqual({ min: 20, max: 30 });
    expect(limitsOf('sidebar', 25, 64).max).toBe(15);
  });
  it('never drops the maximum below the minimum', () => {
    expect(limitsOf('editor', 24, 64)).toEqual({ min: 20, max: 20 });
  });
});

describe('separators', () => {
  it('adds a vertical separator with a name and pixel ARIA values per panel', () => {
    const { sidebar, editor } = render();
    expect(sidebar.getAttribute('role')).toBe('separator');
    expect(sidebar.getAttribute('aria-orientation')).toBe('vertical');
    expect(sidebar.getAttribute('aria-label')).toBe('Resize lists sidebar');
    expect(editor.getAttribute('aria-label')).toBe('Resize task editor');
    expect(sidebar.getAttribute('aria-valuenow')).toBe(String(16 * REM));
    expect(sidebar.getAttribute('aria-valuemin')).toBe(String(12 * REM));
    expect(sidebar.getAttribute('aria-valuemax')).toBe(String(24 * REM));
    expect(editor.getAttribute('aria-valuenow')).toBe(String(25 * REM));
    expect(sidebar.tabIndex).toBe(0);
  });
  it('grows the sidebar when dragged right and the editor when dragged left', () => {
    const { root, sidebar, editor } = render();
    drag(sidebar, 32);
    expect(width(root, '--width-sidebar')).toBe('18rem');
    drag(editor, -48);
    expect(width(root, '--width-side-panel')).toBe('28rem');
    expect(editor.getAttribute('aria-valuenow')).toBe(String(28 * REM));
  });
  it('stops a drag at the limits', () => {
    const { root, sidebar, editor } = render();
    drag(sidebar, 2000);
    expect(width(root, '--width-sidebar')).toBe('24rem');
    drag(editor, 2000);
    expect(width(root, '--width-side-panel')).toBe('20rem');
  });
  it('steps 1rem per arrow key, in the direction of the edge', () => {
    const { root, sidebar, editor } = render();
    press(sidebar, 'ArrowRight');
    press(sidebar, 'ArrowRight');
    press(sidebar, 'ArrowLeft');
    expect(width(root, '--width-sidebar')).toBe('17rem');
    press(editor, 'ArrowLeft');
    expect(width(root, '--width-side-panel')).toBe('26rem');
    press(editor, 'ArrowRight');
    press(editor, 'ArrowRight');
    expect(width(root, '--width-side-panel')).toBe('24rem');
  });
  it('jumps to the limits with Home and End', () => {
    const { root, sidebar } = render();
    press(sidebar, 'Home');
    expect(width(root, '--width-sidebar')).toBe('12rem');
    press(sidebar, 'End');
    expect(width(root, '--width-sidebar')).toBe('24rem');
  });
  it('resets to the default with double-click and with Enter', () => {
    const { root, sidebar, editor } = render();
    press(sidebar, 'End');
    sidebar.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(width(root, '--width-sidebar')).toBe('16rem');
    press(editor, 'Home');
    press(editor, 'Enter');
    expect(width(root, '--width-side-panel')).toBe('25rem');
  });
  it('lets the main column keep 24rem at a narrower window', () => {
    window.innerWidth = 1200;
    const { root, sidebar, editor } = render();
    press(editor, 'End');
    expect(width(root, '--width-side-panel')).toBe('35rem');
    press(sidebar, 'End');
    expect(width(root, '--width-sidebar')).toBe('16rem');
    expect(Number(sidebar.getAttribute('aria-valuemax'))).toBe(16 * REM);
  });
  it('clamps the widths when the window shrinks', () => {
    const { root, editor } = render();
    press(editor, 'End');
    window.innerWidth = 1100;
    window.dispatchEvent(new Event('resize'));
    expect(width(root, '--width-side-panel')).toBe('32.75rem');
    expect(width(root, '--width-sidebar')).toBe('12rem');
  });
});

describe('persistence', () => {
  it('saves the widths when a drag or a key step ends', () => {
    const { sidebar, editor } = render();
    drag(sidebar, 32);
    expect(JSON.parse(localStorage.getItem('todos.view.panels'))).toEqual({ sidebar: 18, editor: 25 });
    press(editor, 'ArrowLeft');
    expect(JSON.parse(localStorage.getItem('todos.view.panels'))).toEqual({ sidebar: 18, editor: 26 });
  });
  it('restores the saved widths on the next render', () => {
    localStorage.setItem('todos.view.panels', JSON.stringify({ sidebar: 20, editor: 30 }));
    const { root, sidebar } = render();
    expect(width(root, '--width-sidebar')).toBe('20rem');
    expect(width(root, '--width-side-panel')).toBe('30rem');
    expect(sidebar.getAttribute('aria-valuenow')).toBe(String(20 * REM));
  });
  it.each([
    ['unreadable JSON', '{nope'],
    ['a non-object', '7'],
    ['non-numbers', JSON.stringify({ sidebar: 'wide', editor: null })],
    ['out of range values', JSON.stringify({ sidebar: 99, editor: 1 })],
  ])('falls back to the defaults for %s', (_name, stored) => {
    localStorage.setItem('todos.view.panels', stored);
    const { root } = render();
    expect(width(root, '--width-sidebar')).toBe('16rem');
    expect(width(root, '--width-side-panel')).toBe('25rem');
  });
  it('changes nothing visible when storage fails', () => {
    const { root, sidebar } = render();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    press(sidebar, 'ArrowRight');
    expect(width(root, '--width-sidebar')).toBe('17rem');
    vi.restoreAllMocks();
  });
});

describe('nav states', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const WIDE_MEDIA = { matches: true, addEventListener() {}, removeEventListener() {} };

  /**
   * Render the shell at 1100 px with a wide nav toggle and a 4rem rail.
   * @returns {{root: HTMLElement, editor: HTMLElement, toggle: HTMLButtonElement, nav: HTMLElement}} the parts
   */
  function renderNav() {
    window.innerWidth = 1100;
    const root = document.body.appendChild(document.createElement('div'));
    const shell = renderShell(root, { navigate: vi.fn(), navMedia: WIDE_MEDIA });
    shell.editor.hidden = false;
    const nav = root.querySelector('.app__sidebar');
    // happy-dom lays nothing out: the rail measures 4rem.
    nav.getBoundingClientRect = () => ({ width: 4 * REM, height: 0, top: 0, left: 0, right: 4 * REM, bottom: 0, x: 0, y: 0 });
    return { root, editor: root.querySelector('[data-panel="editor"]'), toggle: root.querySelector('.app__nav-toggle'), nav };
  }

  it('limits the editor by the 4rem rail instead of the 16rem open sidebar', async () => {
    expect(limitsOf('editor', 4, 68.75).max).toBe(40);
    expect(limitsOf('editor', 16, 68.75).max).toBe(28.75);
    const { root, editor, toggle } = renderNav();
    await tick();
    expect(editor.getAttribute('aria-valuemax')).toBe(String(28.75 * REM));
    toggle.click();
    await tick();
    expect(editor.getAttribute('aria-valuemax')).toBe(String(40 * REM));
    press(editor, 'End');
    expect(width(root, '--width-side-panel')).toBe('40rem');
  });
  it('ignores the stored sidebar width while the sidebar is hidden', async () => {
    localStorage.setItem('todos.view.panels', JSON.stringify({ sidebar: 24, editor: 25 }));
    const { root, editor, toggle, nav } = renderNav();
    await tick();
    expect(width(root, '--width-sidebar')).toBe('19.75rem');
    expect(editor.getAttribute('aria-valuemax')).toBe(String(25 * REM));
    toggle.click();
    toggle.click();
    await tick();
    expect(nav.hidden).toBe(true);
    expect(editor.getAttribute('aria-valuemax')).toBe(String(40 * REM));
    press(editor, 'End');
    expect(width(root, '--width-side-panel')).toBe('40rem');
    expect(JSON.parse(localStorage.getItem('todos.view.panels'))).toEqual({ sidebar: 24, editor: 40 });
  });
  it('reclamps the editor when the sidebar reopens and keeps the stored widths for a wider window', async () => {
    const { root, editor, toggle } = renderNav();
    toggle.click();
    await tick();
    press(editor, 'End');
    expect(width(root, '--width-side-panel')).toBe('40rem');
    toggle.click();
    toggle.click();
    await tick();
    // The sidebar yields first, as on a window resize.
    expect(editor.getAttribute('aria-valuemax')).toBe(String(32.75 * REM));
    expect(width(root, '--width-side-panel')).toBe('32.75rem');
    expect(width(root, '--width-sidebar')).toBe('12rem');
    expect(JSON.parse(localStorage.getItem('todos.view.panels'))).toEqual({ sidebar: 16, editor: 40 });
    window.innerWidth = 1440;
    window.dispatchEvent(new Event('resize'));
    expect(width(root, '--width-sidebar')).toBe('16rem');
    expect(width(root, '--width-side-panel')).toBe('40rem');
  });
});

describe('compact layout and restoration', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('leaves the width tokens alone below 64rem and applies them when the window widens', () => {
    localStorage.setItem('todos.view.panels', JSON.stringify({ sidebar: 20, editor: 30 }));
    window.innerWidth = 800;
    const { root } = render();
    expect(width(root, '--width-sidebar')).toBe('');
    expect(width(root, '--width-side-panel')).toBe('');
    window.innerWidth = 1440;
    window.dispatchEvent(new Event('resize'));
    expect(width(root, '--width-sidebar')).toBe('20rem');
    expect(width(root, '--width-side-panel')).toBe('30rem');
    window.innerWidth = 900;
    window.dispatchEvent(new Event('resize'));
    expect(width(root, '--width-sidebar')).toBe('');
    expect(width(root, '--width-side-panel')).toBe('');
  });
  it('restores the chosen widths when the window shrinks and grows again', () => {
    const { root, sidebar, editor } = render();
    press(editor, 'End');
    press(sidebar, 'ArrowRight');
    window.innerWidth = 1100;
    window.dispatchEvent(new Event('resize'));
    expect(width(root, '--width-sidebar')).toBe('12rem');
    window.innerWidth = 1440;
    window.dispatchEvent(new Event('resize'));
    expect(width(root, '--width-sidebar')).toBe('17rem');
    expect(width(root, '--width-side-panel')).toBe('40rem');
    expect(JSON.parse(localStorage.getItem('todos.view.panels'))).toEqual({ sidebar: 17, editor: 40 });
  });
  it('does not save clamped widths when only the window changes', () => {
    localStorage.setItem('todos.view.panels', JSON.stringify({ sidebar: 24, editor: 40 }));
    render();
    window.innerWidth = 1100;
    window.dispatchEvent(new Event('resize'));
    expect(JSON.parse(localStorage.getItem('todos.view.panels'))).toEqual({ sidebar: 24, editor: 40 });
  });
  it('gives the sidebar its width back while the editor is closed, and takes it again on reopening', async () => {
    localStorage.setItem('todos.view.panels', JSON.stringify({ sidebar: 24, editor: 30 }));
    window.innerWidth = 1100;
    const { root } = render();
    const slot = root.querySelector('[data-editor-slot]');
    await tick();
    expect(width(root, '--width-sidebar')).toBe('14.75rem');
    slot.hidden = true;
    await tick();
    expect(width(root, '--width-sidebar')).toBe('24rem');
    slot.hidden = false;
    await tick();
    expect(width(root, '--width-sidebar')).toBe('14.75rem');
    expect(width(root, '--width-side-panel')).toBe('30rem');
  });
});
