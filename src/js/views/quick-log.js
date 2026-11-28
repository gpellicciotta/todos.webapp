/**
 * Quick log: the small non-modal form under a task row that logs one entry of a time, amount, or reading goal (`TSK-21`).
 *
 * It is titled after the task, such as "Log for Sport". The goal's own field comes first: Time spent as hours and minutes,
 * or the Amount or Reading with the goal's unit. "+ More" reveals the other fields: Time spent, Amount, Check, and Label,
 * since one entry may hold any mix of them. Log posts one `log` entry through `submit` and closes the form; Cancel and Escape
 * close it without a change. A duration above 12 hours asks in place first, with Change and Log anyway.
 * `parseEntry` checks the values against the service limits: whole minutes, amounts with at most 3 decimals,
 * and labels of at most 100 characters.
 * See docs/specs/ui-design.md, Quick Log.
 */

import { make } from '../ui/dom.js';

/** A duration above this many seconds asks for a confirmation first. */
export const CONFIRM_ABOVE_SECONDS = 12 * 3600;
const MAX_SECONDS = 2_147_483_647;
const MAX_AMOUNT = 999_999_999_999.999;
const MAX_LABEL = 100;

const STRINGS = Object.freeze({
  title: (description) => `Log for ${description}`,
  hours: 'Hours',
  minutes: 'Minutes',
  amount: 'Amount',
  reading: 'Reading',
  check: 'Check',
  label: 'Label',
  more: '+ More',
  log: 'Log',
  cancel: 'Cancel',
  change: 'Change',
  anyway: 'Log anyway',
  ask: (seconds) => `Log ${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min? That is more than 12 hours.`,
  timeInvalid: 'Enter whole hours and minutes, at least 1 minute, with minutes up to 59.',
  amountInvalid: 'Enter a number with at most 3 decimals.',
  labelLong: `Use at most ${MAX_LABEL} characters.`,
  nothing: 'Enter a time, an amount, or a check to log.',
});

/**
 * Read the values of the quick log into a `log` entry.
 * @param {{checked: boolean, amount: string, hours: string, minutes: string, label: string}} fields the field values as typed
 * @returns {{entry: object, seconds: number}|{errors: {time?: string, amount?: string, label?: string, nothing?: string}}}
 *   the entry and its time in seconds, or the error of each invalid field
 */
export function parseEntry({ checked, amount, hours, minutes, label }) {
  const entry = {};
  const errors = {};
  if (checked) {
    entry.checked = true;
  }
  const amountText = amount.trim();
  if (amountText !== '') {
    if (/^\d+(\.\d{1,3})?$/.test(amountText) && Number(amountText) <= MAX_AMOUNT) {
      entry.amount = Number(amountText);
    }
    else {
      errors.amount = STRINGS.amountInvalid;
    }
  }
  const hoursText = hours.trim();
  const minutesText = minutes.trim();
  if (hoursText !== '' || minutesText !== '') {
    const hoursValue = hoursText === '' ? 0 : Number(hoursText);
    const minutesValue = minutesText === '' ? 0 : Number(minutesText);
    const seconds = hoursValue * 3600 + minutesValue * 60;
    if (!Number.isInteger(hoursValue) || !Number.isInteger(minutesValue) || hoursValue < 0 || minutesValue < 0
      || minutesValue > 59 || seconds < 60 || seconds > MAX_SECONDS) {
      errors.time = STRINGS.timeInvalid;
    }
    else {
      entry['time-spent-seconds'] = seconds;
    }
  }
  const labelText = label.trim();
  if (labelText.length > MAX_LABEL) {
    errors.label = STRINGS.labelLong;
  }
  else if (labelText) {
    entry.label = labelText;
  }
  if (Object.keys(errors).length === 0 && !('checked' in entry || 'amount' in entry || 'time-spent-seconds' in entry)) {
    errors.nothing = STRINGS.nothing;
  }
  return Object.keys(errors).length > 0 ? { errors } : { entry, seconds: entry['time-spent-seconds'] ?? 0 };
}

/**
 * Create a labeled input inside a wrapper that can hide.
 * @param {Document} doc the document
 * @param {string} part the part name
 * @param {string} text the label text
 * @param {object} input the input settings
 * @returns {{wrap: HTMLElement, control: HTMLInputElement}} the wrapper and its input
 */
function fieldOf(doc, part, text, input) {
  const wrap = make(doc, 'label', 'quick-log__field');
  wrap.dataset.part = part;
  const control = make(doc, 'input', 'field__control');
  Object.assign(control, input);
  control.autocomplete = 'off';
  wrap.append(make(doc, 'span', 'quick-log__label', text), control);
  return { wrap, control };
}

/**
 * Create a button of the form.
 * @param {Document} doc the document
 * @param {string} action the action name
 * @param {string} text the text
 * @param {'primary'|'secondary'} kind `primary` for a button that logs, `secondary` for any other
 * @returns {HTMLButtonElement} the button
 */
function buttonOf(doc, action, text, kind) {
  const button = make(doc, 'button', `button button--${kind}`, text);
  button.type = 'button';
  button.dataset.action = action;
  return button;
}

/**
 * Create the quick log of a task.
 * @param {object} options the options
 * @param {Document} [options.document] the document
 * @param {string} options.description the task description, in the title
 * @param {{measure: string, unit: string|null}} options.goal the measure and unit of the goal, which choose its own field
 * @param {(entry: object) => Promise<unknown>} options.submit posts the entry; a rejection with name `ValidationError` shows
 *   its message in the form, any other rejection closes the form after the caller reported it
 * @param {(reason: 'logged'|'cancel'|'failed') => void} options.close tells the caller to remove the form
 * @returns {{element: HTMLFormElement, focus: () => void}} the form and its focus action
 */
export function createQuickLog({ document: doc = globalThis.document, description, goal, submit, close }) {
  const element = make(doc, 'form', 'quick-log');
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', STRINGS.title(description));
  element.noValidate = true;
  const title = make(doc, 'p', 'quick-log__title', STRINGS.title(description));
  const own = goal.measure === 'time' ? 'time' : 'amount';
  const hours = fieldOf(doc, 'hours', STRINGS.hours, { name: 'hours', type: 'number', min: '0', step: '1', inputMode: 'numeric' });
  const minutes = fieldOf(doc, 'minutes', STRINGS.minutes, { name: 'minutes', type: 'number', min: '0', max: '59', step: '1', inputMode: 'numeric' });
  const time = make(doc, 'div', 'quick-log__part quick-log__time');
  time.dataset.part = 'time';
  time.append(hours.wrap, minutes.wrap);
  const amount = fieldOf(doc, 'amount', goal.measure === 'reading' ? STRINGS.reading : STRINGS.amount,
    { name: 'amount', type: 'text', inputMode: 'decimal' });
  const amountPart = make(doc, 'div', 'quick-log__part');
  amountPart.dataset.part = 'amount-part';
  amountPart.append(amount.wrap);
  if (goal.unit && (goal.measure === 'amount' || goal.measure === 'reading')) {
    amountPart.append(make(doc, 'span', 'quick-log__unit', goal.unit));
  }
  const check = make(doc, 'label', 'quick-log__part checkbox');
  check.dataset.part = 'check';
  const checked = make(doc, 'input', 'checkbox__control');
  checked.type = 'checkbox';
  checked.name = 'checked';
  check.append(checked, ` ${STRINGS.check}`);
  const label = fieldOf(doc, 'label', STRINGS.label, { name: 'label', type: 'text', maxLength: 200 });
  const labelPart = make(doc, 'div', 'quick-log__part');
  labelPart.append(label.wrap);
  const parts = { time, amount: amountPart, check, label: labelPart };
  const hidden = { time: own !== 'time', amount: own !== 'amount', check: true, label: true };
  const error = make(doc, 'p', 'quick-log__error field__error');
  error.dataset.part = 'error';
  error.setAttribute('role', 'status');
  const confirm = make(doc, 'div', 'quick-log__confirm');
  confirm.dataset.part = 'confirm';
  confirm.setAttribute('role', 'alert');
  confirm.hidden = true;
  const question = make(doc, 'p', 'quick-log__question');
  const anyway = buttonOf(doc, 'anyway', STRINGS.anyway, 'primary');
  confirm.append(question, buttonOf(doc, 'change', STRINGS.change, 'secondary'), anyway);
  const more = buttonOf(doc, 'more', STRINGS.more, 'secondary');
  const actions = make(doc, 'div', 'quick-log__actions');
  const log = buttonOf(doc, 'log', STRINGS.log, 'primary');
  actions.append(more, buttonOf(doc, 'cancel', STRINGS.cancel, 'secondary'), log);
  element.append(title, time, amountPart, check, labelPart, error, confirm, actions);

  /** True while a posted entry awaits the store, so no path posts a second one. */
  let pending = false;

  /** Show or hide each part by its state. */
  function showParts() {
    for (const [name, part] of Object.entries(parts)) {
      part.hidden = hidden[name];
    }
  }
  showParts();

  /** Take the question about a long duration away, and the entry it asked about; the buttons of the form return. */
  function endQuestion() {
    delete element.dataset.pending;
    confirm.hidden = true;
    actions.hidden = false;
  }

  /**
   * Show an error under the fields, or clear it.
   * @param {string} text the message, empty for none
   */
  function fail(text) {
    error.textContent = text;
  }

  /**
   * Post an entry and close the form once stored; a refused entry stays in the form with the store's message.
   * @param {object} entry the entry
   */
  async function post(entry) {
    if (pending) {
      return;
    }
    pending = true;
    endQuestion();
    log.disabled = true;
    try {
      await submit(entry);
    }
    catch (problem) {
      pending = false;
      log.disabled = false;
      if (problem?.name === 'ValidationError') {
        fail(problem.message);
        return;
      }
      close('failed');
      return;
    }
    close('logged');
  }

  /** Read the form, ask first for a very long duration, and post the entry. */
  function onLog() {
    if (pending) {
      return;
    }
    fail('');
    // Each attempt replaces an open question, so Log anyway never posts values that changed since.
    endQuestion();
    const read = parseEntry({
      checked: !hidden.check && checked.checked,
      amount: hidden.amount ? '' : amount.control.value,
      hours: hidden.time ? '' : hours.control.value,
      minutes: hidden.time ? '' : minutes.control.value,
      label: hidden.label ? '' : label.control.value,
    });
    if (read.errors) {
      fail(read.errors.time ?? read.errors.amount ?? read.errors.label ?? read.errors.nothing);
      return;
    }
    if (read.seconds > CONFIRM_ABOVE_SECONDS) {
      question.textContent = STRINGS.ask(read.seconds);
      confirm.hidden = false;
      actions.hidden = true;
      element.dataset.pending = JSON.stringify(read.entry);
      anyway.focus();
      return;
    }
    post(read.entry);
  }

  element.addEventListener('click', (event) => {
    const action = event.target.closest?.('[data-action]')?.dataset.action;
    if (action === 'more') {
      for (const name of Object.keys(hidden)) {
        hidden[name] = false;
      }
      showParts();
      more.hidden = true;
    }
    else if (action === 'log') {
      onLog();
    }
    else if (action === 'cancel') {
      close('cancel');
    }
    else if (action === 'change') {
      endQuestion();
      hours.control.focus();
    }
    else if (action === 'anyway' && element.dataset.pending) {
      post(JSON.parse(element.dataset.pending));
    }
  });
  element.addEventListener('submit', (event) => {
    event.preventDefault();
    onLog();
  });
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close('cancel');
    }
    else if (event.key === 'Enter' && event.target.matches?.('input:not([type="checkbox"])')) {
      event.preventDefault();
      onLog();
    }
  });

  return {
    element,
    focus() {
      (own === 'time' ? hours.control : amount.control).focus();
    },
  };
}
