/**
 * Reordering of the list view rows (`LV-3`): drag by the handle, press and drag the row, a long hold on touch,
 * Alt+Up and Alt+Down, Alt+Home and Alt+End, and Move up and Move down.
 * The Lists screen reuses it for its list rows, through the row, handle, identifier, and `ends` options; it drags by
 * the handle only, since the `press` option is off by default, and its Move to top and Move to bottom call `jump`.
 *
 * Every move turns into one before or after neighbor for the store's `moveInList`.
 * Neighbors come from the shown tasks, rendered or not, so a move skips the tasks the status filter hides.
 * A drag marks the dragged row with `data-dragging` and the drop spot with `data-drop`, as app-components.css draws.
 * A pointer within 48 px of the scroller's top or bottom edge scrolls it each frame; row midpoints count from the
 * list's top in row heights, so the drop spot follows the scrolled rows, also those rendered during the drag.
 * Escape, a lost pointer capture, or a render that replaces the dragged row cancels a drag.
 *
 * With `press`, a primary press on a row outside its controls starts a drag once a mouse or pen moves 6 px; a shorter
 * press stays a click. A touch starts one after a 400 ms hold that moves 10 px at most, with a short vibration where
 * supported; a longer move first lets the page scroll. The click that ends a row drag opens nothing.
 * While a press is pending or a drag runs, the browser starts no link drag, text selection, context menu, or scroll.
 */

const EDGE_PX = 48;
const SCROLL_PX = 12;
/** The row height when the dragged row has no layout: the 48 px of the `--row-height` token. */
const ROW_PX = 48;
/** The move of a mouse or pen press that turns it into a drag. */
const PRESS_PX = 6;
/** The touch hold that starts a drag, and the move that cancels it first. */
const HOLD_MS = 400;
const HOLD_PX = 10;
const VIBRATE_MS = 15;
/** How long the click that follows a row drag is ignored, should the browser send it at all. */
const CLICK_MS = 300;
/** The controls of a row, which keep their own presses. */
const CONTROLS = 'button, input, select, textarea, [role="button"], [contenteditable="true"]';

/**
 * Compute the placement of a task dropped at a slot of the shown order.
 * @param {string[]} ids the shown task identifiers, in order, including the moved task
 * @param {string} taskId the moved task
 * @param {number} slot the gap it lands in: 0 before the first row, `ids.length` after the last
 * @returns {{placement: {before: string}|{after: string}, index: number}|null} the neighbor and the new
 *   index of the task, or null when the task stays where it is
 */
export function placementAt(ids, taskId, slot) {
  const from = ids.indexOf(taskId);
  const others = ids.filter((id) => id !== taskId);
  if (from < 0 || others.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.min(slot > from ? slot - 1 : slot, others.length));
  if (index === from) {
    return null;
  }
  return { placement: index < others.length ? { before: others[index] } : { after: others.at(-1) }, index };
}

/**
 * Compute the placement of a task moved one row up, before the row above, or down, after the row below.
 * @param {string[]} ids the shown task identifiers, in order
 * @param {string} taskId the moved task
 * @param {-1|1} step -1 for up, 1 for down
 * @returns {{placement: object, index: number}|null} the move, or null past either end
 */
export function placementBy(ids, taskId, step) {
  const from = ids.indexOf(taskId);
  const to = from + step;
  if (from < 0 || to < 0 || to >= ids.length) {
    return null;
  }
  return { placement: step < 0 ? { before: ids[to] } : { after: ids[to] }, index: to };
}

/**
 * Find the slot under the pointer: the number of row midpoints above it.
 * @param {number[]} midpoints the vertical row midpoints, top to bottom
 * @param {number} y the pointer position
 * @returns {number} the slot
 */
export function slotAt(midpoints, y) {
  return midpoints.filter((middle) => middle < y).length;
}

/**
 * Attach reordering to a task list.
 * @param {HTMLElement} list the element holding the `.task-row` rows
 * @param {object} options reorder options
 * @param {() => boolean} options.enabled tells whether moves are on, in manual order only
 * @param {(taskId: string, move: {placement: object, index: number}) => void} options.onMove stores a move
 * @param {() => HTMLElement|null} [options.scroller] the element a drag scrolls, the main column by default
 * @param {() => string[]} [options.ids] the shown task identifiers in order, rendered or not; the rows by default
 * @param {() => number[]} [options.midpoints] the middles of the shown rows from the list's top, in the order of `ids`,
 *   for rows of different heights; rows of the height of the dragged row by default
 * @param {string} [options.row] the selector of a row, `.task-row` by default
 * @param {string} [options.handle] the selector of a drag handle inside a row, `.task-row__handle` by default
 * @param {string} [options.idKey] the `data-` key holding a row's identifier, `taskId` by default
 * @param {boolean} [options.press] whether a press on a row, or a touch hold, drags it too; off by default
 * @param {boolean} [options.ends] whether Alt+Home and Alt+End move the focused row to the top or bottom; off by default
 * @returns {{step: (taskId: string, step: -1|1) => void, jump: (taskId: string, end: -1|1) => void, destroy: () => void}}
 *   the controller
 */
export function attachReorder(list, {
  enabled, onMove, scroller = () => list.closest('.app__main'), ids = null, midpoints = null,
  row: rowSelector = '.task-row', handle: handleSelector = '.task-row__handle', idKey = 'taskId',
  press = false, ends = false,
}) {
  let drag = null;
  /** A row press or touch hold that has not turned into a drag yet. */
  let pending = null;
  /** Whether the next click ends a row drag, and its timer. */
  let swallow = false;
  let swallowTimer = null;
  /** Rows of one list, all rendered, are measured at the drag start, since they may differ in height. */
  const measured = ids === null;

  /**
   * List the rendered rows.
   * @returns {HTMLElement[]} the rows, top to bottom
   */
  const rowsOf = () => [...list.querySelectorAll(rowSelector)];

  /**
   * List the shown task identifiers.
   * @returns {string[]} the identifiers, in order
   */
  const idsOf = ids ?? (() => rowsOf().map((row) => row.dataset[idKey]));

  /** Clear the drop spot. */
  const unmark = () => list.querySelectorAll(`${rowSelector}[data-drop]`).forEach((row) => row.removeAttribute('data-drop'));

  /**
   * Move a task one row, when moves are on and a row is left in that direction.
   * @param {string} taskId the task
   * @param {-1|1} delta the direction
   */
  function step(taskId, delta) {
    const move = enabled() ? placementBy(idsOf(), taskId, delta) : null;
    if (move) {
      onMove(taskId, move);
    }
  }

  /**
   * Move a task to the top or the bottom of the shown tasks, when moves are on and it is not there yet.
   * @param {string} taskId the task
   * @param {-1|1} end -1 for the top, 1 for the bottom
   */
  function jump(taskId, end) {
    const shown = idsOf();
    const move = enabled() ? placementAt(shown, taskId, end < 0 ? 0 : shown.length) : null;
    if (move) {
      onMove(taskId, move);
    }
  }

  /**
   * Show the drop spot of the current slot, or none when the row would stay.
   * @returns {{placement: object, index: number}|null} the move of the current slot
   */
  function mark() {
    const move = placementAt(drag.ids, drag.taskId, drag.slot);
    unmark();
    if (move) {
      const below = drag.slot < drag.ids.length;
      const target = drag.ids[below ? drag.slot : drag.ids.length - 1];
      const row = rowsOf().find((candidate) => candidate.dataset[idKey] === target);
      if (row) {
        row.dataset.drop = below ? 'before' : 'after';
      }
    }
    return move;
  }

  /**
   * End a drag, storing the move unless it was cancelled.
   * @param {boolean} commit whether to store the move
   */
  function finish(commit) {
    if (!drag) {
      return;
    }
    const current = drag;
    const move = current.row.isConnected ? mark() : null;
    drag = null;
    if (current.frame !== null) {
      cancelAnimationFrame(current.frame);
    }
    unmark();
    current.row.removeAttribute('data-dragging');
    current.row.style.removeProperty('translate');
    // The click that ends a row drag must not open the row, also after Escape cancelled the drag.
    swallow ||= current.capture === current.row;
    if (commit && move) {
      onMove(current.taskId, move);
    }
  }

  /** Forget a pending row press or touch hold. */
  function cancelPending() {
    if (pending?.timer) {
      clearTimeout(pending.timer);
    }
    pending = null;
  }

  /**
   * Start a drag of a row.
   * @param {HTMLElement} row the row
   * @param {{startY: number, y: number, pointerId: number, capture: HTMLElement}} from the pointer position at the
   *   press, its position now, the pointer, and the element that captures it: the handle or the row
   */
  function begin(row, { startY, y, pointerId, capture }) {
    const ids = idsOf();
    const height = row.getBoundingClientRect().height || ROW_PX;
    const top = list.getBoundingClientRect().top;
    drag = {
      row, taskId: row.dataset[idKey], ids, slot: ids.indexOf(row.dataset[idKey]),
      startY: startY - top, y, frame: null, capture,
      midpoints: measured
        ? rowsOf().map((each) => each.getBoundingClientRect().top - top + each.getBoundingClientRect().height / 2)
        : midpoints?.() ?? ids.map((_, index) => (index + 0.5) * height),
    };
    capture.setPointerCapture?.(pointerId);
    row.dataset.dragging = 'true';
    if (y !== startY) {
      follow();
    }
  }

  /**
   * Start a drag from a row handle, or a pending press on a row outside its controls.
   * @param {PointerEvent} event the pointer down event
   */
  function onPointerDown(event) {
    swallow = false;
    cancelPending();
    if (event.button !== 0 || !enabled()) {
      return;
    }
    const handle = event.target.closest?.(handleSelector);
    if (handle) {
      event.preventDefault();
      begin(handle.closest(rowSelector), { startY: event.clientY, y: event.clientY, pointerId: event.pointerId, capture: handle });
      return;
    }
    const row = press ? event.target.closest?.(rowSelector) : null;
    const control = event.target.closest?.(CONTROLS);
    if (!row || (control && row.contains(control)) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    const touch = event.pointerType === 'touch';
    pending = { row, pointerId: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY, touch, timer: null };
    if (touch) {
      pending.timer = setTimeout(hold, HOLD_MS);
    }
  }

  /** Start the drag of a touch held long enough, with a short vibration where the device has one. */
  function hold() {
    const current = pending;
    pending = null;
    if (!current.row.isConnected || !enabled()) {
      return;
    }
    begin(current.row, { startY: current.y, y: current.lastY, pointerId: current.pointerId, capture: current.row });
    try {
      list.ownerDocument.defaultView?.navigator.vibrate?.(VIBRATE_MS);
    }
    catch {
      // A browser may refuse the vibration; the drag works without it.
    }
  }

  /**
   * Turn a pending mouse or pen press into a drag once it moved far enough, or let a touch that moves scroll.
   * @param {PointerEvent} event the pointer move event
   */
  function advance(event) {
    const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
    pending.lastY = event.clientY;
    if (pending.touch) {
      if (distance > HOLD_PX) {
        cancelPending();
      }
      return;
    }
    if (distance >= PRESS_PX) {
      const current = pending;
      pending = null;
      if (current.row.isConnected && enabled()) {
        begin(current.row, { startY: current.y, y: event.clientY, pointerId: event.pointerId, capture: current.row });
        list.ownerDocument.getSelection?.()?.removeAllRanges();
      }
    }
  }

  /** Move the dragged row to the pointer and mark the drop spot, in positions from the list's top. */
  function follow() {
    const y = drag.y - list.getBoundingClientRect().top;
    drag.row.style.translate = `0 ${y - drag.startY}px`;
    drag.slot = slotAt(drag.midpoints, y);
    mark();
  }

  /** Scroll by one step while the pointer is near an edge of the scroller, then again on the next frame. */
  function autoscroll() {
    drag.frame = null;
    if (!drag.row.isConnected) {
      finish(false);
      return;
    }
    const view = scroller();
    const box = view?.getBoundingClientRect();
    const speed = !box ? 0 : drag.y < box.top + EDGE_PX ? -SCROLL_PX : drag.y > box.bottom - EDGE_PX ? SCROLL_PX : 0;
    if (speed !== 0) {
      view.scrollTop += speed;
      follow();
      drag.frame = requestAnimationFrame(autoscroll);
    }
  }

  /**
   * Follow the pointer with the dragged row, mark the drop spot, and scroll near an edge.
   * @param {PointerEvent} event the pointer move event
   */
  function onPointerMove(event) {
    if (pending && event.pointerId === pending.pointerId) {
      advance(event);
      return;
    }
    if (!drag) {
      return;
    }
    if (!drag.row.isConnected) {
      finish(false);
      return;
    }
    drag.y = event.clientY;
    follow();
    drag.frame ??= requestAnimationFrame(autoscroll);
  }

  /**
   * Cancel a drag with Escape.
   * @param {KeyboardEvent} event the key event
   */
  function onEscape(event) {
    if (event.key === 'Escape' && (drag || pending)) {
      event.preventDefault();
      cancelPending();
      finish(false);
    }
  }

  /**
   * Move the focused row with Alt+Up and Alt+Down, and with `ends`, Alt+Home and Alt+End.
   * @param {KeyboardEvent} event the key event
   */
  function onKeydown(event) {
    const row = event.target.closest?.(rowSelector);
    if (!row || !event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      step(row.dataset[idKey], event.key === 'ArrowUp' ? -1 : 1);
    }
    else if (ends && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      jump(row.dataset[idKey], event.key === 'Home' ? -1 : 1);
    }
  }

  /** End a pending press, or a drag, storing its move. */
  function onPointerUp() {
    cancelPending();
    finish(true);
    forgetClickSoon();
  }

  /** End a pending press, or cancel a drag. */
  function onPointerCancel() {
    cancelPending();
    finish(false);
    forgetClickSoon();
  }

  /** Stop ignoring clicks a moment after the pointer up, when the browser sent no click after a row drag. */
  function forgetClickSoon() {
    if (swallow) {
      clearTimeout(swallowTimer);
      swallowTimer = setTimeout(() => {
        swallow = false;
      }, CLICK_MS);
    }
  }

  /**
   * Cancel a drag when the capturing element lost its capture, or left the page with a render.
   * The touched element's implicit capture passing to the dragged row ends nothing.
   * @param {PointerEvent} event the lost capture event
   */
  function onLostCapture(event) {
    const target = event.target;
    if (drag && (target === drag.capture || target.nodeType !== 1 || !target.isConnected)) {
      finish(false);
    }
  }

  /**
   * Keep the click that ends a row drag from opening the row.
   * @param {MouseEvent} event the click
   */
  function onClick(event) {
    if (swallow) {
      swallow = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Keep the browser from dragging a row's link, which would end the row drag, while row presses are on.
   * @param {DragEvent} event the drag start event
   */
  function onDragStart(event) {
    if (press && event.target.closest?.(rowSelector)) {
      event.preventDefault();
    }
  }

  /**
   * Keep the browser from selecting text, opening a context menu, or scrolling during a row press or a drag.
   * @param {Event} event the select start, context menu, or touch move event
   */
  function onPressDefault(event) {
    const rowDrag = drag !== null && drag.capture === drag.row;
    const blocked = {
      selectstart: drag !== null || pending !== null,
      contextmenu: rowDrag || Boolean(pending?.touch),
      touchmove: drag !== null,
    };
    if (blocked[event.type]) {
      event.preventDefault();
    }
  }

  const doc = list.ownerDocument;
  list.addEventListener('pointerdown', onPointerDown);
  list.addEventListener('pointermove', onPointerMove);
  list.addEventListener('pointerup', onPointerUp);
  list.addEventListener('pointercancel', onPointerCancel);
  list.addEventListener('keydown', onKeydown);
  list.addEventListener('click', onClick, true);
  list.addEventListener('dragstart', onDragStart);
  list.addEventListener('selectstart', onPressDefault);
  list.addEventListener('contextmenu', onPressDefault);
  list.addEventListener('touchmove', onPressDefault, { passive: false });
  doc.addEventListener('keydown', onEscape);
  // A render that drops the handle drops its pointer capture too, so the pointer up may never reach the list.
  doc.addEventListener('lostpointercapture', onLostCapture);

  return {
    step,
    jump,

    /** Cancel a drag and stop listening. */
    destroy() {
      cancelPending();
      finish(false);
      clearTimeout(swallowTimer);
      list.removeEventListener('pointerdown', onPointerDown);
      list.removeEventListener('pointermove', onPointerMove);
      list.removeEventListener('pointerup', onPointerUp);
      list.removeEventListener('pointercancel', onPointerCancel);
      list.removeEventListener('keydown', onKeydown);
      list.removeEventListener('click', onClick, true);
      list.removeEventListener('dragstart', onDragStart);
      list.removeEventListener('selectstart', onPressDefault);
      list.removeEventListener('contextmenu', onPressDefault);
      list.removeEventListener('touchmove', onPressDefault, { passive: false });
      doc.removeEventListener('keydown', onEscape);
      doc.removeEventListener('lostpointercapture', onLostCapture);
    },
  };
}
