import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SERVER_URL, parseServerUrl, readEnterAdds, readNavState, readPanelWidths, readPreference, readServerUrl, readTheme, writeEnterAdds, writeNavState,
  writePanelWidths, writePreference, writeServerUrl, writeTheme,
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

  it('accepts a plain light or dark value stored without JSON quotes', () => {
    const storage = memoryStorage();
    for (const theme of ['light', 'dark']) {
      storage.setItem('todos.theme', theme);
      expect(readTheme(() => storage)).toBe(theme);
    }
    storage.setItem('todos.theme', 'purple');
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

describe('Make Enter add preference', () => {
  it('is on when storage is empty, throws, or holds anything but false', () => {
    const storage = memoryStorage();
    expect(readEnterAdds(() => storage)).toBe(true);
    expect(readEnterAdds(() => throwing)).toBe(true);
    storage.setItem('todos.enter-adds', JSON.stringify('no'));
    expect(readEnterAdds(() => storage)).toBe(true);
  });

  it('stores the choice under todos.enter-adds, so a reload reads it back', () => {
    const storage = memoryStorage();
    expect(writeEnterAdds(false, () => storage)).toBe(true);
    expect(storage.data.get('todos.enter-adds')).toBe('false');
    expect(readEnterAdds(() => storage)).toBe(false);
    expect(writeEnterAdds(true, () => storage)).toBe(true);
    expect(readEnterAdds(() => storage)).toBe(true);
    expect(writeEnterAdds(false, () => throwing)).toBe(false);
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

describe('panel widths preference', () => {
  it('defaults to 16rem and 25rem', () => {
    expect(readPanelWidths(() => memoryStorage())).toEqual({ sidebar: 16, editor: 25 });
    expect(readPanelWidths(() => throwing)).toEqual({ sidebar: 16, editor: 25 });
  });
  it('round-trips widths and falls back per value when one is bad', () => {
    const storage = memoryStorage();
    expect(writePanelWidths({ sidebar: 14, editor: 30 }, () => storage)).toBe(true);
    expect(storage.data.get('todos.view.panels')).toBe('{"sidebar":14,"editor":30}');
    expect(readPanelWidths(() => storage)).toEqual({ sidebar: 14, editor: 30 });
    storage.setItem('todos.view.panels', '{"sidebar":99,"editor":30}');
    expect(readPanelWidths(() => storage)).toEqual({ sidebar: 16, editor: 30 });
  });
  it('reports a failed write', () => {
    expect(writePanelWidths({ sidebar: 14, editor: 30 }, () => throwing)).toBe(false);
  });
});

describe('navigation state preference', () => {
  it('defaults to open for a missing, unknown, or unreadable entry', () => {
    const storage = memoryStorage();
    expect(readNavState(() => storage)).toBe('open');
    storage.setItem('todos.view.nav', '"wide"');
    expect(readNavState(() => storage)).toBe('open');
    storage.setItem('todos.view.nav', 'not json');
    expect(readNavState(() => storage)).toBe('open');
    expect(readNavState(() => throwing)).toBe('open');
  });
  it('round-trips open, rail, and hidden under todos.view.nav, and refuses other values', () => {
    const storage = memoryStorage();
    for (const state of ['rail', 'hidden', 'open']) {
      expect(writeNavState(state, () => storage)).toBe(true);
      expect(storage.data.get('todos.view.nav')).toBe(JSON.stringify(state));
      expect(readNavState(() => storage)).toBe(state);
    }
    expect(writeNavState('wide', () => storage)).toBe(false);
    expect(readNavState(() => storage)).toBe('open');
    expect(writeNavState('rail', () => throwing)).toBe(false);
  });
});

describe('app version', () => {
  it('matches package.json and names an ISO build date', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(VERSION).toBe(pkg.version);
    expect(BUILD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
