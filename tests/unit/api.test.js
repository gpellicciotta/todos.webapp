import { describe, expect, it } from 'vitest';
import { createApi, judge, SyncStop } from '../../src/js/sync/api.js';
import { fakeService, fakeSession } from './sync-fake-service.js';

describe('the API client', () => {
  it('sends the client version, the token, and the edit time, and never If-Match', async () => {
    const service = fakeService();
    const api = createApi({ session: fakeSession(), fetch: service.fetch, version: '0.2.1-pre' });
    await api.send('POST', '/api/lists', { body: { id: 'l1', name: 'Home' }, editTime: '2026-11-04T09:00:00.000Z' });
    const { headers, path, body } = service.calls[0];
    expect(path).toBe('/api/lists');
    expect(body).toEqual({ id: 'l1', name: 'Home' });
    expect(headers['Client-Version']).toBe('todos.webapp/0.2.1');
    expect(headers.Authorization).toBe('Bearer token-1');
    expect(headers['Edit-Time']).toBe('2026-11-04T09:00:00.000Z');
    expect(Object.keys(headers).map((name) => name.toLowerCase())).not.toContain('if-match');
  });

  it('turns a lost connection into a retry stop', async () => {
    const api = createApi({
      session: fakeSession(),
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await expect(api.send('GET', '/api/lists')).rejects.toMatchObject({ kind: 'retry', offline: true });
  });

  it('stops for sign-in without a token', async () => {
    const api = createApi({ session: fakeSession({ status: 'sign-in-needed' }), fetch: async () => ({}) });
    await expect(api.send('GET', '/api/lists')).rejects.toMatchObject({ kind: 'auth' });
  });

  it('judges replies', () => {
    const reply = (status, headers = {}) => ({ status, ok: status < 300, headers: { get: (name) => headers[name.toLowerCase()] ?? null } });
    expect(judge(reply(200))).toBe('done');
    expect(judge(reply(201))).toBe('done');
    for (const status of [400, 403, 404, 409, 412]) {
      expect(judge(reply(status))).toBe('rejected');
    }
    expect(() => judge(reply(401))).toThrow(SyncStop);
    expect(() => judge(reply(503))).toThrow(expect.objectContaining({ kind: 'retry', offline: false }));
    expect(() => judge(reply(426, { upgrade: 'todos.webapp/1.0.0' }))).toThrow(expect.objectContaining({ kind: 'upgrade', minimum: '1.0.0' }));
  });
});
