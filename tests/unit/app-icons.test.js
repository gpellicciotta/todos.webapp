import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

// The shared support.webapp hexagon icons (docs/devops.md, App Icons):
// blue-flat for the favicon and in-app logos, blue-dimensional for the install icons.

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(REPO, 'src');
const read = (path) => readFileSync(join(REPO, path), 'utf8');
const FLAT_SVG = 'img/todos-icon.svg';
const FLAT_192 = 'img/todos-icon-192.png';

/**
 * Read the width and height of a PNG from its IHDR chunk.
 * @param {string} path web path relative to src/
 * @returns {{width: number, height: number}} the pixel size
 */
function pngSize(path) {
  const bytes = readFileSync(join(SRC, path));
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * Read the precache list from the service worker source.
 * @returns {string[]} the entries of the `PRECACHE` array
 */
function precacheList() {
  const body = read('src/service-worker.js').match(/const PRECACHE = \[([\s\S]*?)\];/)?.[1] ?? '';
  return [...body.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

/**
 * Collect the icon links of the start page head.
 * @returns {{rel: string, href: string, type: string|null, sizes: string|null}[]} the links
 */
function headIcons() {
  const head = new new Window().DOMParser().parseFromString(read('src/index.html'), 'text/html').head;
  return [...head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].map((link) => ({
    rel: link.getAttribute('rel'),
    href: link.getAttribute('href'),
    type: link.getAttribute('type'),
    sizes: link.getAttribute('sizes'),
  }));
}

/**
 * List every file under a folder, as paths relative to the repository.
 * @param {string} folder absolute folder
 * @returns {string[]} the relative paths, with forward slashes
 */
function walk(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    return entry.isDirectory() ? walk(path) : [relative(REPO, path).split(sep).join('/')];
  });
}

const manifest = JSON.parse(read('src/manifest.webmanifest'));

describe('manifest icons', () => {
  it('lists the dimensional any and maskable PNGs at 192 and 512 px, without an SVG entry', () => {
    expect(manifest.icons).toEqual([
      { src: 'img/install/todos-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'img/install/todos-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'img/install/todos-icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: 'img/install/todos-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]);
  });

  it('points at PNG files of the declared size', () => {
    for (const icon of manifest.icons) {
      const [width, height] = icon.sizes.split('x').map(Number);
      expect(pngSize(icon.src), icon.src).toEqual({ width, height });
    }
  });
});

describe('head icon links', () => {
  it('links favicon.ico, the flat SVG, and the dimensional apple touch icon', () => {
    expect(headIcons()).toEqual([
      { rel: 'icon', href: 'favicon.ico', type: null, sizes: 'any' },
      { rel: 'icon', href: FLAT_SVG, type: 'image/svg+xml', sizes: null },
      { rel: 'apple-touch-icon', href: 'img/install/todos-apple-touch-icon.png', type: null, sizes: null },
    ]);
  });

  it('serves an ICO favicon, an SVG with the Lucide ISC notice, and a 180 px touch icon', () => {
    expect([...readFileSync(join(SRC, 'favicon.ico')).subarray(0, 4)]).toEqual([0, 0, 1, 0]);
    const svg = readFileSync(join(SRC, FLAT_SVG), 'utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('Lucide square-check-big');
    expect(svg).toContain('ISC License');
    expect(pngSize('img/install/todos-apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
  });
});

describe('in-app logos', () => {
  it('show the flat SVG in the sidebar brand of the app and the gallery', () => {
    expect(read('src/js/ui/layout.js')).toContain(`src="${FLAT_SVG}"`);
    expect(read('src/demo/visual-style-gallery.html')).toContain(`src="../${FLAT_SVG}"`);
  });

  it('use the flat 192 px PNG for the sign-in logo and reminder notifications', () => {
    expect(read('src/js/views/settings.js')).toContain(`new URL('${FLAT_192}'`);
    expect(read('src/js/app.js')).toContain(`icon: '${FLAT_192}'`);
    expect(pngSize(FLAT_192)).toEqual({ width: 192, height: 192 });
    expect(pngSize('img/todos-icon-128.png')).toEqual({ width: 128, height: 128 });
  });
});

describe('service worker precache', () => {
  it('holds every icon of the head, the manifest, and the in-app logos', () => {
    const icons = [
      ...headIcons().map((link) => link.href),
      ...manifest.icons.map((icon) => icon.src),
      FLAT_192,
      'img/todos-icon-128.png',
    ];
    expect(precacheList()).toEqual(expect.arrayContaining(icons));
  });
});

describe('old app icon', () => {
  it('is gone with its render script, and nothing names it', () => {
    for (const path of ['src/img/app-icon.svg', 'src/img/app-icon-192.png', 'src/img/app-icon-512.png', 'scripts/render-app-icons.mjs']) {
      expect(existsSync(join(REPO, path)), path).toBe(false);
    }
    const sources = [...walk(SRC), ...walk(join(REPO, 'scripts'))].filter((path) => /\.(html|js|mjs|json|webmanifest|css|py)$/.test(path));
    const naming = sources.filter((path) => read(path).includes('app-icon'));
    expect(naming).toEqual([]);
  });

  it('leaves the Lucide notice in the repository notices, since PNG copies cannot carry it', () => {
    const notice = read('NOTICE.md');
    expect(notice).toContain('Lucide');
    expect(notice).toContain('ISC License');
    expect(notice).toContain('Copyright (c) 2026 Lucide Icons and Contributors');
  });
});
