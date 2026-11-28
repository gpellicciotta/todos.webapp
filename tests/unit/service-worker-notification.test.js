import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const SOURCE = readFileSync(fileURLToPath(new URL('../../src/service-worker.js', import.meta.url)), 'utf8');

/**
 * Load the service worker with a fake client list and click a notification.
 * @param {object[]} windows the open window clients
 * @param {object} [data] the data of the clicked notification
 * @returns {Promise<{opened: string[], close: Function}>} what the worker did
 */
async function click(windows, data = { taskId: 't1' }) {
  const handlers = {};
  const opened = [];
  const context = {
    URL,
    Promise,
    Request,
    encodeURIComponent,
    self: {
      location: new URL('https://todos.example/todos.webapp/service-worker.js'),
      addEventListener: (type, handler) => {
        handlers[type] = handler;
      },
      clients: {
        matchAll: async () => windows,
        openWindow: async (url) => {
          opened.push(url);
        },
      },
    },
  };
  runInNewContext(SOURCE, context);
  const close = vi.fn();
  let waiting = null;
  handlers.notificationclick({ notification: { close, data }, waitUntil: (promise) => {
    waiting = promise;
  } });
  await waiting;
  return { opened, close };
}

/**
 * Load the service worker and deliver one push to it.
 * @param {object|null|string} payload the JSON payload, a raw string, or null for a push without data
 * @returns {Promise<{shown: {title: string, options: object}[]}>} the notifications the worker showed
 */
async function push(payload) {
  const handlers = {};
  const shown = [];
  const context = {
    URL,
    Promise,
    Request,
    Date,
    Intl,
    encodeURIComponent,
    self: {
      location: new URL('https://todos.example/todos.webapp/service-worker.js'),
      addEventListener: (type, handler) => {
        handlers[type] = handler;
      },
      registration: { showNotification: async (title, options) => shown.push({ title, options }) },
    },
  };
  runInNewContext(SOURCE, context);
  let waiting = Promise.resolve();
  const data = payload === null ? null : { json: () => (typeof payload === 'string' ? JSON.parse(payload) : payload) };
  handlers.push({ data, waitUntil: (promise) => {
    waiting = promise;
  } });
  await waiting;
  return { shown };
}

describe('push in the service worker', () => {
  const task = {
    type: 'task-due',
    tag: 'task-due:t1:2026-11-17T09:00:00.000Z',
    'task-id': 't1',
    occurrence: 3,
    description: 'Renew the gym pass',
    'due-time': '2026-11-17T09:00:00Z',
    'action-url': '/#/tasks/t1',
  };

  it('shows a pushed reminder with its description, due time, tag, and task', async () => {
    const { shown } = await push(task);
    expect(shown).toHaveLength(1);
    expect(shown[0].title).toBe('Renew the gym pass');
    expect(shown[0].options.tag).toBe('task-due:t1:2026-11-17T09:00:00.000Z');
    expect(shown[0].options.data).toEqual({ taskId: 't1' });
    expect(shown[0].options.body).toMatch(/^Due .*2026/);
    expect(shown[0].options.icon).toBe('https://todos.example/todos.webapp/img/todos-icon-192.png');
  });

  it('uses the tag of the payload, so it replaces the local reminder of the same due time', async () => {
    const local = await push(task);
    const pushed = await push({ ...task });
    expect(pushed.shown[0].options.tag).toBe(local.shown[0].options.tag);
  });

  it('shows a summary for several tasks that opens the app', async () => {
    const { shown } = await push({ type: 'tasks-due', tag: 'tasks-due', count: 5, 'action-url': '/#/tasks' });
    expect(shown[0].title).toBe('5 tasks came due');
    expect(shown[0].options.tag).toBe('tasks-due');
    expect(shown[0].options.data).toEqual({});
  });

  it('shows a generic reminder for a push it cannot read, since the browser requires a visible notification', async () => {
    for (const payload of [null, '{', { type: 'other' }]) {
      const { shown } = await push(payload);
      expect(shown).toHaveLength(1);
      expect(shown[0].options.tag).toBe('task-due-unknown');
    }
  });
});

describe('notification click in the service worker', () => {
  it('closes the notification and focuses an open window, telling it which task to open', async () => {
    const client = { focus: vi.fn(async () => client), postMessage: vi.fn() };
    const { opened, close } = await click([client]);
    expect(close).toHaveBeenCalled();
    expect(client.focus).toHaveBeenCalled();
    expect(client.postMessage).toHaveBeenCalledWith({ type: 'open-task', taskId: 't1' });
    expect(opened).toEqual([]);
  });

  it('opens a window at the task when none is open', async () => {
    const { opened } = await click([]);
    expect(opened).toEqual(['https://todos.example/todos.webapp/#/tasks/t1']);
  });

  it('opens the app for a summary notification', async () => {
    const { opened } = await click([], {});
    expect(opened).toEqual(['https://todos.example/todos.webapp/']);
  });
});
