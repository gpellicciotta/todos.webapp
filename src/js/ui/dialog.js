/**
 * Dialog behavior: native `<dialog>` modals with a focus trap, Escape to cancel, and focus return.
 *
 * Buttons with `data-dialog-close="{{value}}"` close the dialog with that value.
 * A `<form method="dialog">` closes it natively with the submit button's value.
 */

import { tabbableIn } from './popover.js';

/**
 * Open a `<dialog>` as a modal and manage its keyboard and focus behavior until it closes.
 * @param {HTMLDialogElement} dialog dialog to open
 * @param {object} [options] behavior options
 * @param {HTMLElement} [options.opener] element that gets focus back on close, the focused one by default
 * @param {HTMLElement} [options.initialFocus] control to focus on open, the first tabbable one by default
 * @param {(returnValue: string) => void} [options.onClose] called once after the dialog closes;
 *   Escape closes with `cancel`
 * @returns {(returnValue?: string) => void} a function that closes the dialog with a value
 */
export function openDialog(dialog, options = {}) {
  const doc = dialog.ownerDocument;
  const opener = options.opener ?? doc.activeElement;
  let finished = false;

  /**
   * Close the dialog with a return value.
   * @param {string} [returnValue] value for `dialog.returnValue`
   */
  function close(returnValue) {
    if (dialog.open) {
      dialog.close(returnValue);
    }
  }

  /**
   * Cancel on Escape and keep Tab inside the dialog.
   * @param {KeyboardEvent} event keydown event
   */
  function onKeydown(event) {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close('cancel');
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const controls = tabbableIn(dialog);
    if (controls.length === 0) {
      event.preventDefault();
      return;
    }
    const active = doc.activeElement;
    const inside = active !== dialog && dialog.contains(active);
    if (event.shiftKey && (!inside || active === controls[0])) {
      event.preventDefault();
      controls.at(-1).focus();
    }
    else if (!event.shiftKey && (!inside || active === controls.at(-1))) {
      event.preventDefault();
      controls[0].focus();
    }
  }

  /**
   * Close with the value of a clicked `data-dialog-close` button.
   * @param {MouseEvent} event click event
   */
  function onClick(event) {
    const button = event.target.closest('[data-dialog-close]');
    if (button && dialog.contains(button)) {
      close(button.dataset.dialogClose || button.value || '');
    }
  }

  /**
   * Turn the browser's own cancel request, such as a back gesture, into a `cancel` close.
   * @param {Event} event cancel event
   */
  function onCancel(event) {
    event.preventDefault();
    close('cancel');
  }

  /**
   * Remove the listeners, return focus to the opener, and report the return value.
   */
  function onCloseEvent() {
    if (finished) {
      return;
    }
    finished = true;
    dialog.removeEventListener('keydown', onKeydown);
    dialog.removeEventListener('click', onClick);
    dialog.removeEventListener('cancel', onCancel);
    dialog.removeEventListener('close', onCloseEvent);
    if (opener?.isConnected && typeof opener.focus === 'function') {
      opener.focus();
    }
    options.onClose?.(dialog.returnValue);
  }

  dialog.addEventListener('keydown', onKeydown);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('cancel', onCancel);
  dialog.addEventListener('close', onCloseEvent);
  dialog.returnValue = '';
  if (!dialog.open) {
    dialog.showModal();
  }
  const active = doc.activeElement;
  const target = options.initialFocus ?? (active !== dialog && dialog.contains(active) ? null : tabbableIn(dialog)[0]);
  target?.focus();
  return close;
}

/**
 * Open a confirmation dialog and wait for its answer.
 * @param {HTMLDialogElement} dialog dialog whose buttons close it with a value
 * @param {object} [options] options as for `openDialog`
 * @returns {Promise<boolean>} true unless the dialog closed with `cancel` or an empty value
 */
export function confirmDialog(dialog, options = {}) {
  return new Promise((resolve) => {
    openDialog(dialog, {
      ...options,
      onClose(returnValue) {
        options.onClose?.(returnValue);
        resolve(returnValue !== '' && returnValue !== 'cancel');
      },
    });
  });
}
