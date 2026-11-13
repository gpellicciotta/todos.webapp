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

  it('lays out the app with the vendored shell.css, imported after the look and before the app stylesheets', () => {
    const style = readFileSync(join(SRC, 'css', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const imports = [...style.matchAll(/@import\s+url\('([^']+)'\)/g)].map((match) => match[1]);
    expect(imports[4]).toBe('../vendor/design/css/shell.css');
    expect(existsSync(join(SRC, 'css', 'app-shell.css'))).toBe(false);
  });

  it('keeps the vendored bytes exact across platform checkouts', () => {
    const attributes = existsSync(join(ROOT, '.gitattributes')) ? readFileSync(join(ROOT, '.gitattributes'), 'utf8') : '';
    expect(attributes).toMatch(/^src\/vendor\/\*\* -text$/m);
  });

  it('provides the tokens: style.css loads the vendored base and neutral look before the app stylesheets', () => {
    const style = readFileSync(join(SRC, 'css', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const imports = [...style.matchAll(/@import\s+url\('([^']+)'\)/g)].map((match) => match[1]);
    expect(imports.slice(0, 4)).toEqual([
      '../vendor/design/css/base.css',
      '../vendor/design/looks/neutral/primitives.css',
      '../vendor/design/looks/neutral/fonts.css',
      '../vendor/design/looks/neutral/look.css',
    ]);
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
