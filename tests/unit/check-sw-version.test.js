import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkVersion, hashPrecache, parseWorker, run } from '../../scripts/check-sw-version.mjs';

const WORKER = (version) => `const VERSION = '${version}';
const PRECACHE = [
  './',
  'index.html',
  'css/style.css',
  'img/icon.png',
];
`;

let root;
let manifest;

/**
 * Write a small web root with a worker, two text files, and one binary file.
 * @param {string} version the worker VERSION
 */
async function writeRoot(version) {
  await writeFile(join(root, 'service-worker.js'), WORKER(version));
  await writeFile(join(root, 'index.html'), '<!doctype html>\n<title>App</title>\n');
  await writeFile(join(root, 'css', 'style.css'), 'body {}\n');
  await writeFile(join(root, 'img', 'icon.png'), Buffer.from([0x89, 0x50, 0x0d, 0x0a]));
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'check-sw-version-'));
  await mkdir(join(root, 'css'));
  await mkdir(join(root, 'img'));
  manifest = join(root, 'hashes.json');
  await writeRoot('1');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('parseWorker', () => {
  it('reads VERSION and the PRECACHE entries', () => {
    expect(parseWorker(WORKER('2026-11-04.2'))).toEqual({
      version: '2026-11-04.2',
      precache: ['./', 'index.html', 'css/style.css', 'img/icon.png'],
    });
  });

  it('throws when VERSION or PRECACHE is missing', () => {
    expect(() => parseWorker('const PRECACHE = [];')).toThrow(/VERSION/);
    expect(() => parseWorker("const VERSION = '1';")).toThrow(/PRECACHE/);
  });
});

describe('hashPrecache', () => {
  it('hashes every precached file except the start URL', async () => {
    const files = await hashPrecache(root, ['./', 'index.html', 'img/icon.png']);
    expect(Object.keys(files)).toEqual(['index.html', 'img/icon.png']);
    expect(files['index.html']).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ignores CRLF line endings in text files, so Windows and CI checkouts agree', async () => {
    const lf = await hashPrecache(root, ['index.html']);
    await writeFile(join(root, 'index.html'), '<!doctype html>\r\n<title>App</title>\r\n');
    expect(await hashPrecache(root, ['index.html'])).toEqual(lf);
  });

  it('keeps binary files byte exact', async () => {
    const before = await hashPrecache(root, ['img/icon.png']);
    await writeFile(join(root, 'img', 'icon.png'), Buffer.from([0x89, 0x50, 0x0a]));
    expect(await hashPrecache(root, ['img/icon.png'])).not.toEqual(before);
  });
});

describe('checkVersion', () => {
  const current = { version: '1', files: { 'index.html': 'a', 'css/style.css': 'b' } };

  it('passes when the manifest matches the worker and its files', () => {
    expect(checkVersion(current, structuredClone(current))).toEqual({ ok: true, bumped: false, changed: [] });
  });

  it('fails when a precached file changed but VERSION did not', () => {
    const result = checkVersion({ version: '1', files: { 'index.html': 'a', 'css/style.css': 'c' } }, current);
    expect(result).toEqual({ ok: false, bumped: false, changed: ['css/style.css'] });
  });

  it('counts added and removed precache entries as changes', () => {
    const result = checkVersion({ version: '1', files: { 'index.html': 'a', 'js/app.js': 'd' } }, current);
    expect(result.changed).toEqual(['css/style.css', 'js/app.js']);
    expect(result.ok).toBe(false);
  });

  it('fails when VERSION was bumped but the manifest was not updated', () => {
    const result = checkVersion({ version: '2', files: { 'index.html': 'a', 'css/style.css': 'c' } }, current);
    expect(result).toEqual({ ok: false, bumped: true, changed: ['css/style.css'] });
  });
});

describe('run', () => {
  it('writes the manifest with --update, then passes the check', async () => {
    const out = [];
    expect(await run(['--root', root, '--manifest', manifest, '--update'], out)).toBe(0);
    const written = JSON.parse(await readFile(manifest, 'utf8'));
    expect(written.version).toBe('1');
    expect(Object.keys(written.files)).toEqual(['index.html', 'css/style.css', 'img/icon.png']);
    expect(await run(['--root', root, '--manifest', manifest], out)).toBe(0);
    expect(out.at(-1)).toMatch(/^OK: /);
  });

  it('exits 1 when a precached file changed without a VERSION bump, and refuses --update', async () => {
    await run(['--root', root, '--manifest', manifest, '--update'], []);
    await writeFile(join(root, 'css', 'style.css'), 'body { color: red; }\n');
    const out = [];
    expect(await run(['--root', root, '--manifest', manifest], out)).toBe(1);
    expect(out.join('\n')).toMatch(/css\/style\.css/);
    expect(out.join('\n')).toMatch(/Bump VERSION/);
    expect(await run(['--root', root, '--manifest', manifest, '--update'], out)).toBe(1);
  });

  it('accepts the change after VERSION is bumped and the manifest is updated', async () => {
    await run(['--root', root, '--manifest', manifest, '--update'], []);
    await writeRoot('2');
    await writeFile(join(root, 'css', 'style.css'), 'body { color: red; }\n');
    const out = [];
    expect(await run(['--root', root, '--manifest', manifest], out)).toBe(1);
    expect(out.join('\n')).toMatch(/--update/);
    expect(await run(['--root', root, '--manifest', manifest, '--update'], out)).toBe(0);
    expect(await run(['--root', root, '--manifest', manifest], out)).toBe(0);
  });

  it('exits 1 with a hint when the manifest does not exist', async () => {
    const out = [];
    expect(await run(['--root', root, '--manifest', manifest], out)).toBe(1);
    expect(out.join('\n')).toMatch(/--update/);
  });

  it('exits 2 on an unknown option', async () => {
    expect(await run(['--bogus'], [])).toBe(2);
  });
});
