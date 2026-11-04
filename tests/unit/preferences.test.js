import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SERVER_URL, parseServerUrl, readPreference, readServerUrl, readTheme, writePreference, writeServerUrl, writeTheme,
} from '../../src/js/core/preferences.js';
import { BUILD_DATE, VERSION } from '../../src/js/version.js';

/**
 * Create an in-memory storage stand-in.
 * @returns {Storage & {data: Map<string, string>}} the storage
 */
function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

/** A storage whose every call throws, as in a blocked private window. */
const throwing = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('readPreference', () => {
  it('returns the fallback when storage is empty, throws, is missing, or holds malformed JSON', () => {
    const storage = memoryStorage();
    expect(readPreference('view.tasks', 'dflt', () => storage)).toBe('dflt');
    expect(readPreference('view.tasks', 'dflt', () => throwing)).toBe('dflt');
    expect(readPreference('view.tasks', 'dflt', () => undefined)).toBe('dflt');
    expect(readPreference('view.tasks', 'dflt', () => {
      throw new Error('no storage');
    })).toBe('dflt');
    storage.setItem('todos.view.tasks', '{oops');
    expect(readPreference('view.tasks', 'dflt', () => storage)).toBe('dflt');
  });

  it('reads back what writePreference stored, and reports failed writes', () => {
    const storage = memoryStorage();
    expect(writePreference('view.tasks', { a: 1 }, () => storage)).toBe(true);
    expect(readPreference('view.tasks', null, () => storage)).toEqual({ a: 1 });
    expect(writePreference('view.tasks', { a: 1 }, () => throwing)).toBe(false);
  });
});

describe('theme preference', () => {
  it('defaults to system when storage is empty, throws, or holds another value', () => {
    const storage = memoryStorage();
    expect(readTheme(() => storage)).toBe('system');
    expect(readTheme(() => throwing)).toBe('system');
    storage.setItem('todos.theme', JSON.stringify('purple'));
    expect(readTheme(() => storage)).toBe('system');
  });

  it('stores light, dark, and system under todos.theme', () => {
    const storage = memoryStorage();
    for (const theme of ['dark', 'light', 'system']) {
      expect(writeTheme(theme, () => storage)).toBe(true);
      expect(storage.data.get('todos.theme')).toBe(JSON.stringify(theme));
      expect(readTheme(() => storage)).toBe(theme);
    }
    expect(writeTheme('dark', () => throwing)).toBe(false);
  });
});

describe('server URL preference', () => {
  it('defaults to the production service when storage is empty, throws, or holds an invalid URL', () => {
    const storage = memoryStorage();
    expect(readServerUrl(() => storage)).toBe(DEFAULT_SERVER_URL);
    expect(readServerUrl(() => throwing)).toBe(DEFAULT_SERVER_URL);
    storage.setItem('todos.server-url', JSON.stringify('ftp://example.com'));
    expect(readServerUrl(() => storage)).toBe(DEFAULT_SERVER_URL);
  });

  it('stores a normalized http or https URL and rejects others', () => {
    const storage = memoryStorage();
    expect(writeServerUrl('  https://todos.example.com/  ', () => storage)).toBe(true);
    expect(readServerUrl(() => storage)).toBe('https://todos.example.com');
    expect(writeServerUrl('not a url', () => storage)).toBe(false);
    expect(readServerUrl(() => storage)).toBe('https://todos.example.com');
  });

  it('parses only http and https URLs without credentials', () => {
    expect(parseServerUrl('http://localhost:8080/api/')).toBe('http://localhost:8080/api');
    expect(parseServerUrl('http://127.0.0.1:8863')).toBe('http://127.0.0.1:8863');
    expect(parseServerUrl('')).toBeNull();
    expect(parseServerUrl('javascript:alert(1)')).toBeNull();
    expect(parseServerUrl('https://user:pw@example.com')).toBeNull();
  });

  it('allows http only for this machine, since a token must not cross the network in clear text', () => {
    expect(parseServerUrl('http://todos.example.com')).toBeNull();
    expect(parseServerUrl('http://192.168.1.20:8080')).toBeNull();
    expect(parseServerUrl('http://[::1]:8080/')).toBe('http://[::1]:8080');
    const storage = memoryStorage();
    storage.setItem('todos.server-url', JSON.stringify('http://todos.example.com'));
    expect(readServerUrl(() => storage)).toBe(DEFAULT_SERVER_URL);
  });

  it('keeps only the origin and the path, dropping the query and the fragment', () => {
    expect(parseServerUrl('https://todos.example.com/base/?token=1#/x')).toBe('https://todos.example.com/base');
    expect(parseServerUrl('http://localhost:8080/?a=b')).toBe('http://localhost:8080');
  });
});

describe('app version', () => {
  it('matches package.json and names an ISO build date', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(VERSION).toBe(pkg.version);
    expect(BUILD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
