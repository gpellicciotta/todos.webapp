/**
 * Editor panel: the frame of the task and list editors in the shell's `[data-editor-slot]` element.
 *
 * An editor route mounts its editor into a panel with a title, a close button, and a scrolling body.
 * Wide layouts show the panel at the right of the rows; compact layouts show it over the main column.
 * Escape closes the panel, also from a text field, after that field's change saves (`TSK-1`).
 * Closing returns focus to the control that opened the panel, or to the editor's own return target.
 * Field errors also go to a polite live region, so screen readers hear them when they appear.
 */

import { createLiveRegion } from '../ui/live-region.js';
import { spriteIcon } from './task-list.js';

/** Panel strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({ close: { task: 'Close the task editor', list: 'Close the list editor' } });

let instances = 0;
const announcers = new WeakMap();

/**
 * Announce a message through the document's live region, adding one when it has none.
 * @param {Document} doc the document
 * @param {string} message the message
 */
function announce(doc, message) {
  if (!announcers.get(doc)?.region.isConnected) {
    announcers.set(doc, { announcer: createLiveRegion({ document: doc }), region: null });
    announcers.get(doc).region = doc.body.lastElementChild;
  }
  announcers.get(doc).announcer.announce(message);
}

/**
 * Create a field: a label, one control, and an error line that `setError` fills.
 * An error marks the control with `aria-invalid` and points `aria-describedby` at the error line.
 * @param {Document} doc the document
 * @param {object} options field options
 * @param {string} options.label the label text
 * @param {string} options.name the control name
 * @param {'input'|'textarea'} [options.tag] the control element
 * @param {string} [options.type] the input type
 * @param {boolean} [options.hideLabel] keep the label for assistive technology only
 * @returns {{element: HTMLElement, control: HTMLInputElement|HTMLTextAreaElement, setError: Function}} the field
 */
export function createField(doc, { label, name, tag = 'input', type = 'text', hideLabel = false }) {
  const id = `editor-field-${(instances += 1)}`;
  const element = doc.createElement('div');
  element.className = 'field';
  const caption = doc.createElement('label');
  caption.className = hideLabel ? 'field__label visually-hidden' : 'field__label';
  caption.htmlFor = id;
  caption.textContent = label;
  const control = doc.createElement(tag);
  control.className = 'field__control';
  control.id = id;
  control.name = name;
  if (tag === 'input') {
    control.type = type;
  }
  const error = doc.createElement('p');
  error.className = 'field__error';
  error.id = `${id}-error`;
  error.hidden = true;
  element.append(caption, control, error);
  return {
    element, control,

    /**
     * Show or clear the field error.
     * @param {string|null} message the error, or null when the value is valid
     */
    setError(message) {
      error.hidden = !message;
      error.replaceChildren(...(message ? [spriteIcon(doc, 'alert'), message] : []));
      if (message) {
        announce(doc, message);
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('aria-describedby', error.id);
      }
      else {
        control.removeAttribute('aria-invalid');
        control.removeAttribute('aria-describedby');
      }
    },
  };
}

/**
 * Create the editor panel controller of a slot.
 * @param {object} options panel options
 * @param {HTMLElement} options.slot the `[data-editor-slot]` element
 * @param {Object<string, Function>} options.editors mount functions by editor name, such as `task`;
 *   each gets the panel, the route, and the context, and returns `{destroy, returnFocus?}`
 * @param {() => void} options.close leaves the editor route, which then calls `update` again
 * @param {object} [options.context] passed to every mount function, such as the store and the toaster
 * @param {() => HTMLElement|null} [options.fallbackFocus] gets focus on close when no return target is left
 * @returns {{update: (route: object) => void, destroy: () => void}} the controller
 */
export function createEditorPanel({ slot, editors, close, context = {}, fallbackFocus = () => null }) {
  const doc = slot.ownerDocument;
  let open = null;

  /**
   * Close the open editor and empty the slot.
   * @param {boolean} refocus whether focus returns to the opener
   */
  function unmount(refocus) {
    if (!open) {
      return;
    }
    const { controller, opener } = open;
    open = null;
    const hadFocus = slot.contains(doc.activeElement) || doc.activeElement === doc.body;
    const target = controller.returnFocus?.() ?? (opener?.isConnected ? opener : null) ?? fallbackFocus();
    controller.destroy();
    slot.replaceChildren();
    slot.hidden = true;
    if (refocus && hadFocus) {
      target?.focus();
    }
  }

  /**
   * Build an empty panel for an editor.
   * @param {string} name the editor name
   * @returns {{element: HTMLElement, body: HTMLElement, document: Document, setTitle: Function, close: Function}} the panel
   */
  function buildPanel(name) {
    const id = `editor-panel-${(instances += 1)}`;
    const element = doc.createElement('aside');
    element.className = 'editor-panel';
    element.setAttribute('aria-labelledby', `${id}-title`);
    const header = doc.createElement('div');
    header.className = 'editor-panel__header';
    const title = doc.createElement('h2');
    title.className = 'editor-panel__title';
    title.id = `${id}-title`;
    const button = doc.createElement('button');
    button.className = 'icon-button';
    button.type = 'button';
    button.setAttribute('aria-label', STRINGS.close[name] ?? STRINGS.close.task);
    button.append(spriteIcon(doc, 'close'));
    button.addEventListener('click', () => close());
    header.append(title, button);
    const body = doc.createElement('div');
    body.className = 'editor-panel__body';
    element.append(header, body);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        // Blurring a text field fires its change event, which saves it before the panel closes.
        doc.activeElement?.blur?.();
        close();
      }
    });
    return {
      element, body, document: doc,
      setTitle: (text) => {
        title.textContent = text;
      },
      close: () => close(),
    };
  }

  return {
    /**
     * Follow a route: mount its editor, keep an editor whose route did not change, or close it.
     * @param {object} route the route, from the router
     */
    update(route) {
      const mount = route.editor ? editors[route.editor] : null;
      const key = mount ? `${route.name}:${JSON.stringify(route.params)}` : null;
      if (open?.key === key) {
        return;
      }
      const opener = slot.contains(doc.activeElement) ? open?.opener : doc.activeElement;
      unmount(!key);
      if (!mount) {
        return;
      }
      const panel = buildPanel(route.editor);
      slot.replaceChildren(panel.element);
      slot.hidden = false;
      open = { key, opener, controller: mount(panel, route, context) };
    },

    /** Close the open editor without moving focus. */
    destroy() {
      unmount(false);
    },
  };
}
