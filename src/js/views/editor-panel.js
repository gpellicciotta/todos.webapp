/**
 * Editor panel: the frame of the editors and the view options in the shell's `[data-editor-slot]` element.
 *
 * An editor route mounts its editor into a panel with a title, a close button, and a scrolling body.
 * Wide layouts show the panel at the right of the rows; compact layouts show it over the main column.
 * Escape closes the panel, also from a text field, after that field's change saves (`TSK-1`).
 * Closing returns focus to the control that opened the panel, or to the editor's own return target.
 * Editor fields come from the vendored field.js, whose errors also reach a polite live region.
 */

import { createField } from '../../vendor/design/js/field.js';
import { spriteIcon } from './task-list.js';

/** Panel strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  close: { task: 'Close the task editor', list: 'Close the list editor', 'view-options': 'Close the view options' },
});

let instances = 0;

/**
 * Create an editor field with the vendored `createField`, keeping the errors that the editor sets.
 * The editors validate on change and on save, so a blur or an edit re-shows the editor's error instead of clearing it;
 * native constraints, such as an email type, still apply first.
 * @param {Document} doc the document
 * @param {object} options the `createField` options, such as `label`, `name`, `tag`, `type`, and `hideLabel`
 * @returns {ReturnType<typeof createField>} the field controller, whose `setError` the editor calls
 */
export function createEditorField(doc, options) {
  let error = null;
  const field = createField(doc, { ...options, validate: () => error });
  const setError = field.setError;
  field.setError = (message) => {
    error = message || null;
    setError(message);
  };
  return field;
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
