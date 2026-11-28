import { describe, expect, it } from 'vitest';
import {
  applyEvent, DEFAULT_RULES, firstOccurrence, firstRules, foldLogCache, fullOccurrence, fullRules, ruleEditOf,
} from '../../src/js/core/occurrences.js';
import { freshStore } from './store-helpers.js';

const TRACKED = { tracking: () => true };
const LEGACY = ['target-count', 'completion-count'];

/**
 * Name the legacy count fields that a record still holds.
 * @param {object} record a rules or occurrence record
 * @returns {string[]} the legacy fields it holds
 */
const legacyOf = (record) => LEGACY.filter((field) => field in record);

describe('records without the legacy counts', () => {
  it('keeps them out of the default rules and of a new occurrence', () => {
    expect(legacyOf(DEFAULT_RULES)).toEqual([]);
    expect(legacyOf(firstOccurrence(DEFAULT_RULES, '2026-11-04T09:00:00.000Z'))).toEqual([]);
  });

  it('folds an event on the goal target and progress alone', () => {
    const occurrence = { ...firstOccurrence({ ...DEFAULT_RULES, 'goal-target': 2 }, '2026-11-04T09:00:00.000Z'), progress: 1 };
    const next = applyEvent(occurrence, { type: 'log', checked: true, 'creation-time': '2026-11-04T10:00:00.000Z' });
    expect(next).toMatchObject({ 'goal-target': 2, progress: 2, status: 'completed' });
    expect(legacyOf(next)).toEqual([]);
  });

  it('reads the legacy counts of an old record into the goal fields, and drops them', () => {
    expect(fullRules({ 'target-count': 3 })).toMatchObject({ 'goal-target': 3 });
    expect(legacyOf(fullRules({ 'target-count': 3, 'goal-target': 3 }))).toEqual([]);
    const occurrence = fullOccurrence({ occurrence: 1, 'target-count': 3, 'completion-count': 2, status: 'in-progress' });
    expect(occurrence).toMatchObject({ 'goal-target': 3, progress: 2, 'goal-measure': 'checks', 'time-spent-seconds': 0 });
    expect(legacyOf(occurrence)).toEqual([]);
  });

  it('keeps a null progress for a reading goal without a reading', () => {
    const rules = { ...DEFAULT_RULES, 'goal-measure': 'reading', 'goal-target': 70 };
    const occurrence = foldLogCache(firstOccurrence(rules, '2026-11-04T09:00:00.000Z'), [], rules);
    expect(occurrence.progress).toBeNull();
    expect(legacyOf(occurrence)).toEqual([]);
  });

  it('reads a target-count rule edit of a stored event as a goal-target edit', () => {
    const event = { id: 'e1', type: 'edit-lifecycle-rules', 'creation-time': '2026-11-04T10:00:00.000Z', details: { 'target-count': { old: 1, new: 4 } } };
    expect(ruleEditOf(event)).toEqual({ 'goal-target': 4 });
    expect(firstRules({ ...DEFAULT_RULES, 'goal-target': 4 }, [event])['goal-target']).toBe(1);
  });
});

describe('the store without the legacy counts', () => {
  it('writes tasks and occurrences with only the goal fields', async () => {
    const { store } = await freshStore();
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': { 'goal-target': 2 } });
    await store.logEntry(task.id, { checked: true });
    const stored = await store.getTask(task.id);
    expect(stored['current-occurrence']).toMatchObject({ 'goal-target': 2, progress: 1, status: 'in-progress' });
    expect(legacyOf(stored['lifecycle-rules'])).toEqual([]);
    expect(legacyOf(stored['current-occurrence'])).toEqual([]);
    const [occurrence] = await store.occurrencesOfTask(task.id);
    expect(legacyOf(occurrence)).toEqual([]);
    const edited = await store.updateRules(task.id, { 'goal-target': 1 });
    expect(edited['current-occurrence']).toMatchObject({ 'goal-target': 1, progress: 1, status: 'completed' });
    store.close();
  });

  it('rolls back a rule change queued before the upgrade, whose undo data names target-count', async () => {
    const { store } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Count', 'lifecycle-rules': { 'goal-target': 2 } });
    await store.updateRules(task.id, { 'goal-target': 3 });
    const entry = (await store.queue.all()).find((candidate) => candidate.operation === 'update-rules');
    await store.queue.undo(store, { ...entry, undo: { kind: 'rules', id: task.id, fields: { 'target-count': { from: 2, to: 3 } } } });
    const after = await store.getTask(task.id);
    expect(after['lifecycle-rules']['goal-target']).toBe(2);
    expect(after['current-occurrence']['goal-target']).toBe(2);
    expect(legacyOf(after['lifecycle-rules'])).toEqual([]);
    store.close();
  });
});
