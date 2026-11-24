/**
 * Resizable side columns of the wide shell: separators on the inner edges of the lists sidebar and the task editor panel.
 *
 * Each separator resizes by pointer drag and by keys: arrows step 1rem, Home and End jump to the limits,
 * and double-click or Enter restores the default. The width applies as `--width-sidebar` or `--width-side-panel`
 * on the app root, so the vendored shell.css stays unchanged. Widths persist per device (`todos.view.panels`).
 * Below 64rem the separators hide through CSS and the compact layout stays as it is.
 * The editor's limits count the sidebar as shown: its icon rail, or nothing while hidden.
 */

import { readPanelWidths, writePanelWidths } from '../core/preferences.js';

/** Default, minimum, and maximum widths in rem. */
export const PANELS = Object.freeze({
  sidebar: Object.freeze({ min: 12, max: 24, fallback: 16, property: '--width-sidebar', label: 'Resize lists sidebar' }),
  editor: Object.freeze({ min: 20, max: 40, fallback: 25, property: '--width-side-panel', label: 'Resize task editor' }),
});

/** The main column never shrinks below this width in rem. */
export const MAIN_MIN = 24;

/** The window width in rem from which the wide layout, and so the separators, apply. */
export const WIDE_REM = 64;

/** Keyboard step in rem. */
export const STEP = 1;

/**
 * Return the limits of a panel at a window width.
 * @param {'sidebar'|'editor'} kind the panel
 * @param {number} otherRem the width in rem of the other open panel, 0 when none
 * @param {number} viewportRem the window width in rem
 * @returns {{min: number, max: number}} the limits in rem
 */
export function limitsOf(kind, otherRem, viewportRem) {
  const { min, max } = PANELS[kind];
  const room = viewportRem - MAIN_MIN - otherRem;
  return { min, max: Math.max(min, Math.min(max, room)) };
}

/**
 * Clamp a width to the limits of its panel.
 * @param {'sidebar'|'editor'} kind the panel
 * @param {number} rem the wanted width in rem
 * @param {number} otherRem the width in rem of the other open panel, 0 when none
 * @param {number} viewportRem the window width in rem
 * @returns {number} the width in rem
 */
export function clampWidth(kind, rem, otherRem, viewportRem) {
  const { min, max } = limitsOf(kind, otherRem, viewportRem);
  return Math.min(max, Math.max(min, rem));
}

/**
 * Attach the separators to the shell root.
 * @param {HTMLElement} root the `.app` element holding the sidebar and the editor slot
 * @param {object} [options] options
 * @param {() => Storage} [options.getStorage] returns the storage, `localStorage` by default
 * @returns {{refresh: () => void, destroy: () => void}} the controller
 */
export function attachPanelResize(root, { getStorage } = {}) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const slot = root.querySelector('[data-editor-slot]');
  const nav = root.querySelector('.app__sidebar');
  const toggle = root.querySelector('.app__nav-toggle');
  const desired = readPanelWidths(getStorage);
  const widths = { ...desired };
  const separators = {};
  const cleanups = [];

  /** @returns {number} the pixel size of 1rem */
  const remPx = () => Number.parseFloat(win.getComputedStyle(doc.documentElement).fontSize) || 16;
  /** @returns {number} the window width in rem */
  const viewportRem = () => win.innerWidth / remPx();
  /** @returns {boolean} true while the editor panel is open */
  const editorOpen = () => Boolean(slot) && !slot.hidden;
  /**
   * Return the shown sidebar width: the rail as rendered, 0 when hidden, else the open width.
   * The rail is measured, so it follows the vendored rail track; the nav toggle sets both states only from 64rem.
   * @returns {number} the width in rem
   */
  function sidebarShown() {
    if (!nav || viewportRem() < WIDE_REM) {
      return widths.sidebar;
    }
    if (nav.hidden) {
      return 0;
    }
    if (toggle?.getAttribute('aria-expanded') === 'false') {
      return nav.getBoundingClientRect().width / remPx();
    }
    return widths.sidebar;
  }
  /** @returns {number} the shown width in rem of the panel next to the given one, 0 when closed */
  const otherOf = (kind) => (kind === 'sidebar' ? (editorOpen() ? widths.editor : 0) : sidebarShown());
  const limits = (kind) => limitsOf(kind, otherOf(kind), viewportRem());

  /**
   * Show the chosen widths, clamped to what fits now; the chosen widths themselves stay as they are.
   * Below 64rem the tokens are cleared, so the compact layout and the popovers keep their defaults.
   */
  function apply() {
    const wide = viewportRem() >= WIDE_REM;
    widths.sidebar = clampWidth('sidebar', desired.sidebar, editorOpen() ? desired.editor : 0, viewportRem());
    widths.editor = clampWidth('editor', desired.editor, sidebarShown(), viewportRem());
    const px = remPx();
    for (const kind of Object.keys(PANELS)) {
      if (wide) {
        root.style.setProperty(PANELS[kind].property, `${widths[kind]}rem`);
      }
      else {
        root.style.removeProperty(PANELS[kind].property);
      }
      const { min, max } = limits(kind);
      const separator = separators[kind];
      separator.setAttribute('aria-valuenow', String(Math.round(widths[kind] * px)));
      separator.setAttribute('aria-valuemin', String(Math.round(min * px)));
      separator.setAttribute('aria-valuemax', String(Math.round(max * px)));
    }
  }

  /**
   * Choose a width within its limits now.
   * @param {'sidebar'|'editor'} kind the panel
   * @param {number} rem the wanted width in rem
   */
  function setWidth(kind, rem) {
    desired[kind] = clampWidth(kind, rem, otherOf(kind), viewportRem());
    apply();
  }

  /** Store the chosen widths; a failure changes nothing visible. */
  const save = () => writePanelWidths({ sidebar: desired.sidebar, editor: desired.editor }, getStorage);

  /**
   * Create the separator of a panel and wire its events.
   * @param {'sidebar'|'editor'} kind the panel
   * @returns {HTMLElement} the separator
   */
  function createSeparator(kind) {
    const separator = doc.createElement('div');
    separator.className = `panel-resize panel-resize--${kind}`;
    separator.setAttribute('role', 'separator');
    separator.setAttribute('aria-orientation', 'vertical');
    separator.setAttribute('aria-label', PANELS[kind].label);
    separator.tabIndex = 0;
    separator.dataset.panel = kind;
    const direction = kind === 'sidebar' ? 1 : -1;
    let drag = null;
    let frame = 0;
    let latest = 0;

    const flush = () => {
      if (frame) {
        win.cancelAnimationFrame(frame);
        frame = 0;
      }
      if (drag) {
        setWidth(kind, drag.start + (direction * (latest - drag.x)) / remPx());
      }
    };
    separator.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType === 'mouse') {
        return;
      }
      event.preventDefault();
      drag = { x: event.clientX, start: widths[kind] };
      latest = event.clientX;
      separator.setPointerCapture?.(event.pointerId);
      separator.classList.add('panel-resize--dragging');
    });
    separator.addEventListener('pointermove', (event) => {
      if (!drag) {
        return;
      }
      latest = event.clientX;
      frame ||= win.requestAnimationFrame(() => {
        frame = 0;
        flush();
      });
    });
    const end = () => {
      if (!drag) {
        return;
      }
      flush();
      drag = null;
      separator.classList.remove('panel-resize--dragging');
      save();
    };
    separator.addEventListener('pointerup', end);
    separator.addEventListener('pointercancel', end);
    separator.addEventListener('dblclick', () => {
      setWidth(kind, PANELS[kind].fallback);
      save();
    });
    separator.addEventListener('keydown', (event) => {
      const { min, max } = limits(kind);
      const targets = {
        ArrowLeft: widths[kind] - direction * STEP,
        ArrowRight: widths[kind] + direction * STEP,
        Home: min,
        End: max,
        Enter: PANELS[kind].fallback,
      };
      if (!(event.key in targets) || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      event.preventDefault();
      setWidth(kind, targets[event.key]);
      save();
    });
    return separator;
  }

  for (const kind of Object.keys(PANELS)) {
    separators[kind] = createSeparator(kind);
    root.append(separators[kind]);
  }
  apply();

  const onResize = () => apply();
  win.addEventListener('resize', onResize);
  cleanups.push(() => win.removeEventListener('resize', onResize));
  // An opening editor, or a nav toggle step to open, rail, or hidden, changes the room of the other panel.
  const observer = new win.MutationObserver(apply);
  for (const [target, attribute] of [[slot, 'hidden'], [nav, 'hidden'], [toggle, 'aria-expanded']]) {
    if (target) {
      observer.observe(target, { attributes: true, attributeFilter: [attribute] });
    }
  }
  cleanups.push(() => observer.disconnect());

  return {
    refresh: apply,
    destroy() {
      for (const cleanup of cleanups) {
        cleanup();
      }
      for (const separator of Object.values(separators)) {
        separator.remove();
      }
    },
  };
}
