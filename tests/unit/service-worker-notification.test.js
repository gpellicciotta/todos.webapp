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
