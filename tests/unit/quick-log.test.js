// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQuickLog, parseEntry } from '../../src/js/views/quick-log.js';

const EMPTY = { checked: false, amount: '', hours: '', minutes: '', label: '' };

describe('parseEntry', () => {
  it('reads time as whole minutes in seconds, and trims the label', () => {
    expect(parseEntry({ ...EMPTY, hours: '1', minutes: '30', label: ' run ' })).toEqual({ entry: { 'time-spent-seconds': 5400, label: 'run' }, seconds: 5400 });
    expect(parseEntry({ ...EMPTY, minutes: '45' }).entry).toEqual({ 'time-spent-seconds': 2700 });
  });

  it('reads an amount with at most 3 decimals and a check', () => {
    expect(parseEntry({ ...EMPTY, amount: '79.8' }).entry).toEqual({ amount: 79.8 });
    expect(parseEntry({ ...EMPTY, amount: '1.2345' }).errors.amount).toBeTruthy();
    expect(parseEntry({ ...EMPTY, amount: '-2' }).errors.amount).toBeTruthy();
    expect(parseEntry({ ...EMPTY, checked: true, amount: '3' }).entry).toEqual({ checked: true, amount: 3 });
  });

  it('refuses a time below a minute, minutes above 59, fractions, and a label above 100 characters', () => {
    expect(parseEntry({ ...EMPTY, minutes: '0' }).errors.time).toBeTruthy();
    expect(parseEntry({ ...EMPTY, minutes: '75' }).errors.time).toBeTruthy();
    expect(parseEntry({ ...EMPTY, minutes: '1.5' }).errors.time).toBeTruthy();
    expect(parseEntry({ ...EMPTY, minutes: '5', label: 'x'.repeat(101) }).errors.label).toBeTruthy();
  });

  it('refuses an entry that holds no check, time, or amount', () => {
    expect(parseEntry(EMPTY).errors.nothing).toBeTruthy();
    expect(parseEntry({ ...EMPTY, label: 'only a label' }).errors.nothing).toBeTruthy();
  });
});

describe('createQuickLog', () => {
  const sport = { id: 't1', description: 'Sport', measure: 'time', unit: null };
  let submit;
  let close;

  /**
   * Create a quick log for a goal and add it to the page.
   * @param {object} [goal] the goal fields
   * @returns {object} the quick log
   */
  function open(goal = {}) {
    const quick = createQuickLog({ document, description: 'Sport', goal: { ...sport, ...goal }, submit, close });
    document.body.append(quick.element);
    return quick;
  }

  const field = (quick, name) => quick.element.querySelector(`[name="${name}"]`);
  const click = (quick, action) => quick.element.querySelector(`[data-action="${action}"]`).click();

  beforeEach(() => {
    document.body.innerHTML = '';
    submit = vi.fn(async () => undefined);
    close = vi.fn();
  });

  it('is titled after the task and shows the goal field first, with the other fields behind More', () => {
    const quick = open();
    expect(quick.element.getAttribute('aria-label')).toBe('Log for Sport');
    expect(quick.element.querySelector('.quick-log__title').textContent).toBe('Log for Sport');
    expect(field(quick, 'hours')).not.toBeNull();
    expect(field(quick, 'amount').closest('[hidden]')).not.toBeNull();
    expect(field(quick, 'checked').closest('[hidden]')).not.toBeNull();
    click(quick, 'more');
    for (const name of ['hours', 'amount', 'checked', 'label']) {
      expect(field(quick, name).closest('[hidden]'), name).toBeNull();
    }
  });

  it('shows the amount field with the unit for an amount or reading goal', () => {
    const quick = open({ measure: 'reading', unit: 'kg' });
    expect(field(quick, 'amount').closest('[hidden]')).toBeNull();
    expect(field(quick, 'hours').closest('[hidden]')).not.toBeNull();
    expect(quick.element.textContent).toContain('kg');
  });

  it('posts one entry on Log and closes', async () => {
    const quick = open();
    field(quick, 'minutes').value = '45';
    click(quick, 'log');
    await vi.waitFor(() => expect(close).toHaveBeenCalledWith('logged'));
    expect(submit).toHaveBeenCalledWith({ 'time-spent-seconds': 2700 });
  });

  it('shows an error and posts nothing for an invalid entry', () => {
    const quick = open();
    click(quick, 'log');
    expect(submit).not.toHaveBeenCalled();
    expect(quick.element.querySelector('[data-part="error"]').textContent).not.toBe('');
    expect(close).not.toHaveBeenCalled();
  });

  it('asks in place before logging more than 12 hours, with Change and Log anyway', async () => {
    const quick = open();
    field(quick, 'hours').value = '14';
    click(quick, 'log');
    const confirm = quick.element.querySelector('[data-part="confirm"]');
    expect(confirm.hidden).toBe(false);
    expect(confirm.textContent).toContain('Log 14 h 0 min? That is more than 12 hours.');
    expect(submit).not.toHaveBeenCalled();
    click(quick, 'change');
    expect(confirm.hidden).toBe(true);
    click(quick, 'log');
    click(quick, 'anyway');
    await vi.waitFor(() => expect(submit).toHaveBeenCalledWith({ 'time-spent-seconds': 50_400 }));
  });

  it('posts one entry while a request is pending, whatever the repeated Enter or Log anyway presses', async () => {
    let finish;
    submit = vi.fn(() => new Promise((done) => {
      finish = done;
    }));
    const quick = open();
    field(quick, 'minutes').value = '5';
    const enter = () => field(quick, 'minutes').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    enter();
    enter();
    click(quick, 'log');
    expect(submit).toHaveBeenCalledTimes(1);
    finish();
    await vi.waitFor(() => expect(close).toHaveBeenCalledWith('logged'));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('posts a duration above 12 hours once while the confirmed request is pending', () => {
    submit = vi.fn(() => new Promise(() => {}));
    const quick = open();
    field(quick, 'hours').value = '14';
    click(quick, 'log');
    click(quick, 'anyway');
    click(quick, 'anyway');
    field(quick, 'hours').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('closes without a change on Cancel and on Escape', () => {
    const quick = open();
    click(quick, 'cancel');
    expect(close).toHaveBeenLastCalledWith('cancel');
    quick.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).toHaveBeenCalledTimes(2);
    expect(submit).not.toHaveBeenCalled();
  });

  it('keeps the form open with the store error when the entry is rejected', async () => {
    submit = vi.fn(async () => {
      throw Object.assign(new Error('Too much time.'), { name: 'ValidationError' });
    });
    const quick = open();
    field(quick, 'minutes').value = '5';
    click(quick, 'log');
    await vi.waitFor(() => expect(quick.element.querySelector('[data-part="error"]').textContent).toBe('Too much time.'));
    expect(close).not.toHaveBeenCalled();
  });
});
