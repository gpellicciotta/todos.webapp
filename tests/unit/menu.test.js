// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachMenu } from '../../src/js/ui/menu.js';
import { anchorPanel, attachPopover } from '../../src/js/ui/popover.js';

/**
 * Dispatch a keyboard event on an element.
 * @param {Element} target element that receives the event
 * @param {string} key key value, such as `ArrowDown`
 * @param {object} [init] extra event fields, such as `shiftKey`
 * @returns {KeyboardEvent} the dispatched event
 */
function press(target, key, init = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

/**
 * Dispatch a bubbling click on an element.
 * @param {Element} target element that receives the click
 */
function click(target) {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

describe('attachMenu', () => {
  let trigger;
  let menu;
  let items;
  let onSelect;
  let controller;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="trigger" type="button">Status</button>
      <div id="menu" class="menu">
        <button class="menu__item" type="button" role="menuitemradio" aria-checked="true">To do</button>
        <button class="menu__item" type="button" role="menuitemradio" aria-checked="false">In progress</button>
        <button class="menu__item" type="button" role="menuitemradio" aria-checked="false" aria-disabled="true">Completed</button>
        <button class="menu__item" type="button" role="menuitemradio" aria-checked="false">Cancelled</button>
      </div>
      <button id="outside" type="button">Outside</button>
      <p id="text">Plain text</p>`;
    trigger = document.getElementById('trigger');
    menu = document.getElementById('menu');
    items = [...menu.querySelectorAll('.menu__item')];
    onSelect = vi.fn();
    trigger.focus();
    controller = attachMenu(trigger, menu, { onSelect, anchor: false });
  });

  afterEach(() => {
    controller.destroy();
  });

  it('marks up the trigger and the menu and starts closed', () => {
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe('menu');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.hidden).toBe(true);
    expect(items.every((item) => item.getAttribute('tabindex') === '-1')).toBe(true);
  });

  it.each(['Enter', ' ', 'ArrowDown'])('opens on %j and focuses the first item', (key) => {
    const event = press(trigger, key);
    expect(event.defaultPrevented).toBe(true);
    expect(menu.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(items[0]);
  });

  it('opens on ArrowUp and focuses the last item', () => {
    press(trigger, 'ArrowUp');
    expect(document.activeElement).toBe(items[3]);
  });

  it('toggles on trigger clicks', () => {
    click(trigger);
    expect(controller.isOpen()).toBe(true);
    expect(document.activeElement).toBe(items[0]);
    click(trigger);
    expect(controller.isOpen()).toBe(false);
    expect(menu.hidden).toBe(true);
  });

  it('moves down with ArrowDown, skips disabled items, and wraps to the first item', () => {
    press(trigger, 'Enter');
    press(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    press(items[1], 'ArrowDown');
    expect(document.activeElement).toBe(items[3]);
    press(items[3], 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
  });

  it('moves up with ArrowUp and wraps to the last item', () => {
    press(trigger, 'Enter');
    const event = press(items[0], 'ArrowUp');
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[3]);
    press(items[3], 'ArrowUp');
    expect(document.activeElement).toBe(items[1]);
  });

  it('jumps to the first and last items with Home and End', () => {
    press(trigger, 'Enter');
    press(items[0], 'End');
    expect(document.activeElement).toBe(items[3]);
    press(items[3], 'Home');
    expect(document.activeElement).toBe(items[0]);
  });

  it('moves to the next item starting with a typed character', () => {
    press(trigger, 'Enter');
    press(items[0], 'c');
    expect(document.activeElement).toBe(items[3]);
  });

  it.each(['Enter', ' '])('selects the focused item with %j, closes, and returns focus', (key) => {
    press(trigger, 'Enter');
    press(items[0], 'ArrowDown');
    const event = press(items[1], key);
    expect(event.defaultPrevented).toBe(true);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBe(items[1]);
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('checks the selected radio item and unchecks the others', () => {
    press(trigger, 'Enter');
    press(items[0], 'End');
    press(items[3], 'Enter');
    expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false', 'true']);
  });

  it('selects an item on click', () => {
    click(trigger);
    click(items[1]);
    expect(onSelect).toHaveBeenCalledWith(items[1], expect.any(MouseEvent));
    expect(controller.isOpen()).toBe(false);
  });

  it('ignores clicks on disabled items', () => {
    click(trigger);
    click(items[2]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(controller.isOpen()).toBe(true);
  });

  it('closes on Escape and returns focus to the trigger', () => {
    press(trigger, 'Enter');
    press(items[0], 'ArrowDown');
    const event = press(items[1], 'Escape');
    expect(event.defaultPrevented).toBe(true);
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes on an outside click and returns focus to the trigger', () => {
    press(trigger, 'Enter');
    document.activeElement.blur();
    click(document.getElementById('text'));
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps focus on an outside control that took it', () => {
    press(trigger, 'Enter');
    const outside = document.getElementById('outside');
    outside.focus();
    click(outside);
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(outside);
  });

  it('closes on Tab and moves focus back to the trigger before the default Tab move', () => {
    press(trigger, 'Enter');
    const event = press(items[0], 'Tab');
    expect(event.defaultPrevented).toBe(false);
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('stops reacting after destroy', () => {
    controller.destroy();
    press(trigger, 'Enter');
    expect(menu.hidden).toBe(true);
    click(trigger);
    expect(menu.hidden).toBe(true);
  });
});

describe('attachPopover', () => {
  let trigger;
  let panel;
  let onClose;
  let controller;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="trigger" type="button">Status</button>
      <div id="panel" class="popover" role="group">
        <label><input id="first" type="checkbox"> To do</label>
        <button id="clear" type="button">Clear</button>
      </div>
      <p id="text">Plain text</p>`;
    trigger = document.getElementById('trigger');
    panel = document.getElementById('panel');
    onClose = vi.fn();
    trigger.focus();
    controller = attachPopover(trigger, panel, { onClose, anchor: false });
  });

  afterEach(() => {
    controller.destroy();
  });

  it('opens on a trigger click and focuses the first control', () => {
    expect(panel.hidden).toBe(true);
    click(trigger);
    expect(panel.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(document.getElementById('first'));
  });

  it('stays open on clicks inside the panel', () => {
    click(trigger);
    click(document.getElementById('clear'));
    expect(controller.isOpen()).toBe(true);
  });

  it('closes on Escape and returns focus to the trigger', () => {
    click(trigger);
    press(document.getElementById('first'), 'Escape');
    expect(panel.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(onClose).toHaveBeenCalledWith('escape');
  });

  it('closes on an outside click and returns focus to the trigger', () => {
    click(trigger);
    document.activeElement.blur();
    click(document.getElementById('text'));
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(onClose).toHaveBeenCalledWith('outside');
  });
});

describe('anchorPanel', () => {
  /**
   * Place a 192 px panel under a 44 px trigger at the given offset.
   * @param {string} align the alignment option
   * @param {string} direction the trigger's writing direction
   * @returns {number} the panel's left position in pixels
   */
  function place(align, direction) {
    document.body.innerHTML = '<button id="trigger" type="button">User</button><div id="panel"></div>';
    const trigger = document.getElementById('trigger');
    const panel = document.getElementById('panel');
    trigger.style.direction = direction;
    trigger.getBoundingClientRect = () => ({ left: 600, right: 644, top: 16, bottom: 60, width: 44, height: 44 });
    panel.getBoundingClientRect = () => ({ width: 192, height: 100 });
    anchorPanel(panel, trigger, 4, align);
    return Number.parseFloat(panel.style.left);
  }

  it('lines up the start edges by default, and the end edges with align end', () => {
    expect(place('start', 'ltr')).toBe(600);
    expect(place('end', 'ltr')).toBe(644 - 192);
  });

  it('mirrors both alignments for a right-to-left trigger', () => {
    expect(place('start', 'rtl')).toBe(644 - 192);
    expect(place('end', 'rtl')).toBe(600);
  });

  it('keeps the panel inside the viewport', () => {
    document.body.innerHTML = '<button id="trigger" type="button">User</button><div id="panel"></div>';
    const trigger = document.getElementById('trigger');
    const panel = document.getElementById('panel');
    trigger.getBoundingClientRect = () => ({ left: window.innerWidth - 20, right: window.innerWidth + 24, top: 16, bottom: 60, width: 44, height: 44 });
    panel.getBoundingClientRect = () => ({ width: 192, height: 100 });
    anchorPanel(panel, trigger, 4, 'start');
    expect(Number.parseFloat(panel.style.left)).toBe(window.innerWidth - 192 - 4);
  });
});
