// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmDialog, openDialog } from '../../src/js/ui/dialog.js';
import { attachMenu } from '../../src/js/ui/menu.js';

/**
 * Dispatch a keyboard event on an element.
 * @param {Element} target element that receives the event
 * @param {string} key key value, such as `Escape`
 * @param {object} [init] extra event fields, such as `shiftKey`
 * @returns {KeyboardEvent} the dispatched event
 */
function press(target, key, init = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

/**
 * Wait until queued tasks, such as a dialog's close event, have run.
 * @returns {Promise<void>} resolves after the queued tasks
 */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('openDialog', () => {
  let opener;
  let dialog;
  let first;
  let last;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="opener" type="button">Delete list</button>
      <dialog id="dialog" class="dialog" aria-labelledby="title">
        <h3 id="title">Delete the list Groceries?</h3>
        <button id="menu-trigger" type="button">More</button>
        <div id="menu" class="menu"><button class="menu__item" type="button" role="menuitem">Rename</button></div>
        <button id="keep" type="button" data-dialog-close="cancel">Keep</button>
        <button id="delete" type="button" data-dialog-close="delete">Delete list</button>
      </dialog>`;
    opener = document.getElementById('opener');
    dialog = document.getElementById('dialog');
    first = document.getElementById('menu-trigger');
    last = document.getElementById('delete');
    opener.focus();
  });

  it('opens the dialog as a modal and focuses its first control', () => {
    const spy = vi.spyOn(dialog, 'showModal');
    openDialog(dialog);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('focuses a given initial control', () => {
    openDialog(dialog, { initialFocus: document.getElementById('keep') });
    expect(document.activeElement).toBe(document.getElementById('keep'));
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const onClose = vi.fn();
    openDialog(dialog, { onClose });
    const event = press(first, 'Escape');
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(false);
    expect(dialog.returnValue).toBe('cancel');
    expect(onClose).toHaveBeenCalledWith('cancel');
    expect(document.activeElement).toBe(opener);
  });

  it('closes with the value of a close button', async () => {
    const onClose = vi.fn();
    openDialog(dialog, { onClose });
    document.getElementById('delete').click();
    await settle();
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledWith('delete');
    expect(document.activeElement).toBe(opener);
  });

  it('returns a function that closes the dialog with a value', async () => {
    const onClose = vi.fn();
    const close = openDialog(dialog, { onClose });
    close('done');
    await settle();
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledWith('done');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab inside the dialog in both directions', () => {
    openDialog(dialog);
    last.focus();
    const forward = press(last, 'Tab');
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    const backward = press(first, 'Tab', { shiftKey: true });
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('leaves Tab between inner controls to the browser', () => {
    openDialog(dialog);
    const event = press(first, 'Tab');
    expect(event.defaultPrevented).toBe(false);
  });

  it('lets Escape in a menu inside the dialog close only the menu', async () => {
    const menu = attachMenu(first, document.getElementById('menu'), { anchor: false });
    openDialog(dialog);
    press(first, 'Enter');
    press(document.activeElement, 'Escape');
    await settle();
    expect(menu.isOpen()).toBe(false);
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(first);
    menu.destroy();
  });
});

describe('confirmDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="opener" type="button">Import</button>
      <dialog id="dialog" class="dialog">
        <button id="cancel" type="button" data-dialog-close="cancel">Cancel</button>
        <button id="import" type="button" data-dialog-close="import">Import</button>
      </dialog>`;
    document.getElementById('opener').focus();
  });

  it('resolves true when a confirming button closes the dialog', async () => {
    const result = confirmDialog(document.getElementById('dialog'));
    document.getElementById('import').click();
    await expect(result).resolves.toBe(true);
  });

  it('resolves false on Cancel and on Escape', async () => {
    const dialog = document.getElementById('dialog');
    const cancelled = confirmDialog(dialog);
    document.getElementById('cancel').click();
    await expect(cancelled).resolves.toBe(false);
    const escaped = confirmDialog(dialog);
    press(document.getElementById('cancel'), 'Escape');
    await expect(escaped).resolves.toBe(false);
  });
});
