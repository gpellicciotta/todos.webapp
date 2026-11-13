import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SRC = join(ROOT, 'src');
const VENDOR = join(SRC, 'vendor', 'design');

// Old todos.webapp names that ADR-0001 and naming.md of support.webapp renamed, each keeping its value.
const RENAMED = [
  '--color-signal',
  '--color-signal-hover',
  '--color-signal-active',
  '--color-on-signal',
  '--color-hover-bg',
  '--color-active-bg',
  '--color-selected-bg',
  '--space-8',
  '--width-editor',
  '--icon-size',
  '--icon-size-lg',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
];

/**
 * List the app's own CSS, HTML, and JavaScript files under src/, outside the vendored copy.
 * @param {string} folder absolute folder
 * @returns {string[]} absolute file paths
 */
function appFiles(folder = SRC) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      return path === join(SRC, 'vendor') ? [] : appFiles(path);
    }
    return /\.(css|html|js)$/.test(entry.name) ? [path] : [];
  });
}

/**
 * Find the uses of token names in the app's files.
 * @param {string[]} names exact token names
 * @returns {string[]} `file:line: name` for each use
 */
function uses(names) {
  const found = [];
  for (const path of appFiles()) {
    readFileSync(path, 'utf8').split('\n').forEach((line, index) => {
      for (const match of line.matchAll(/--[\w-]+/g)) {
        if (names.includes(match[0])) {
          found.push(`${relative(ROOT, path).split(sep).join('/')}:${index + 1}: ${match[0]}`);
        }
      }
    });
  }
  return found;
}

const CONTRACT = JSON.parse(readFileSync(join(VENDOR, 'contract.json'), 'utf8'));
// Public entry points of ADR-0005: the stylesheets, the look sprite, a module per component key, and the utility modules.
// The package style guide also tells apps to import sw-update.js, the service worker update pattern.
const PUBLIC = new Set([
  'css/style.css',
  'looks/neutral/index.css',
  'looks/neutral/icons.svg',
  ...CONTRACT.components.map((key) => `js/${key}.js`),
  ...['focus', 'anchor', 'live-region', 'i18n', 'sw-update'].map((name) => `js/${name}.js`),
]);

/**
 * Read the imports of style.css, without its comments.
 * @returns {string[]} the imported URLs in order
 */
function styleImports() {
  const style = readFileSync(join(SRC, 'css', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...style.matchAll(/@import\s+url\('([^']+)'\)/g)].map((match) => match[1]);
}

/**
 * Find every reference from an app file into the vendored package, outside comments.
 * The service worker precaches every file that style.css loads, private ones too, so precache.test.js covers it.
 * @returns {{file: string, target: string}[]} the referring file and the package path it names
 */
function vendorReferences() {
  return appFiles().filter((path) => path !== join(SRC, 'service-worker.js')).flatMap((path) => {
    const text = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    return [...text.matchAll(/vendor\/design\/([\w./-]+?\.(?:js|css|svg))/g)]
      .map((match) => ({ file: relative(ROOT, path).split(sep).join('/'), target: match[1] }));
  });
}

describe('the vendored design system', () => {
  it('is pinned by design.json to release 0.1.0 with the neutral look', () => {
    const pin = JSON.parse(readFileSync(join(ROOT, 'design.json'), 'utf8'));
    expect(pin).toEqual({ version: '0.1.0', look: 'neutral', target: 'src/vendor/design', styles: ['src/css'] });
  });

  it('passes the vendored integrity and conformance checks', async () => {
    const { check } = await import(pathToFileURL(join(VENDOR, 'bin', 'check.mjs')).href);
    const result = check(ROOT);
    expect(result.integrity.errors).toEqual([]);
    expect(result.conformance.errors).toEqual([]);
    expect(result.conformance.warnings).toEqual([]);
  });

  it('loads the package through the public neutral look entry point, before the app stylesheets', () => {
    expect(styleImports()).toEqual(['../vendor/design/looks/neutral/index.css', 'tokens.css', 'app-components.css', 'app-chrome.css', 'views.css']);
    expect(existsSync(join(SRC, 'css', 'app-shell.css'))).toBe(false);
    expect(existsSync(join(SRC, 'css', 'controls.css'))).toBe(false);
  });

  it('keeps no app copy of a vendored module', () => {
    const copies = ['dialog', 'menu', 'popover', 'toast', 'live-region', 'sw-update'].filter((name) => existsSync(join(SRC, 'js', 'ui', `${name}.js`)));
    expect(copies).toEqual([]);
    expect(readFileSync(join(SRC, 'js', 'views', 'editor-panel.js'), 'utf8')).not.toMatch(/export function createField/);
  });

  it('references only the public entry points of the vendored package from app files', () => {
    expect(vendorReferences().filter((reference) => !PUBLIC.has(reference.target))).toEqual([]);
  });

  it('points the vendored icons at the look sprite once, at startup', () => {
    expect(readFileSync(join(SRC, 'js', 'app.js'), 'utf8')).toMatch(/setSpriteUrl\('vendor\/design\/looks\/neutral\/icons\.svg'\)/);
  });

  it('keeps the vendored bytes exact across platform checkouts', () => {
    const attributes = existsSync(join(ROOT, '.gitattributes')) ? readFileSync(join(ROOT, '.gitattributes'), 'utf8') : '';
    expect(attributes).toMatch(/^src\/vendor\/\*\* -text$/m);
  });
});

describe('the token renames', () => {
  it('leave no old token name in the app CSS, HTML, or JavaScript', () => {
    expect(uses(RENAMED)).toEqual([]);
  });

  it('leave no private primitive of the neutral look in the app files', () => {
    const primitivesFile = join(VENDOR, 'looks', 'neutral', 'primitives.css');
    expect(existsSync(primitivesFile)).toBe(true);
    const primitives = [...readFileSync(primitivesFile, 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]);
    expect(primitives.length).toBeGreaterThan(0);
    expect(uses(primitives)).toEqual([]);
  });

  it('leave the app defining no token that the vendored base or look defines', () => {
    const defined = (path) => [...readFileSync(path, 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]);
    const vendored = new Set(['css/base.css', 'looks/neutral/primitives.css', 'looks/neutral/look.css']
      .flatMap((name) => (existsSync(join(VENDOR, name)) ? defined(join(VENDOR, name)) : [])));
    expect(vendored.size).toBeGreaterThan(0);
    expect(defined(join(SRC, 'css', 'tokens.css')).filter((name) => vendored.has(name))).toEqual([]);
  });
});
