import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CSS_DIR = fileURLToPath(new URL('../../src/css/', import.meta.url));
const DEMO_DIR = fileURLToPath(new URL('../../src/demo/', import.meta.url));
const TOKENS_FILE = join(CSS_DIR, 'tokens.css');
const THEMES = ['light', 'dark'];

// Grounds that text, controls, and focus rings may sit on.
const GROUNDS = [
  '--color-bg',
  '--color-surface',
  '--color-surface-sunken',
  '--color-hover-bg',
  '--color-selected-bg',
];

// Text tokens that must reach 4.5:1 on every ground.
const TEXT_ON_GROUNDS = ['--color-text', '--color-text-muted', '--color-signal', '--color-link', '--color-danger'];

// Non-text tokens that must reach 3:1 on every ground.
const NON_TEXT_ON_GROUNDS = ['--color-border-strong', '--color-focus'];


// Icon colors that must reach 3:1 on every ground a control can show, including pressed grounds.
const ICONS = [
  '--color-signal',
  '--color-danger',
  '--color-text',
  '--color-text-muted',
  '--color-status-in-progress',
  '--color-status-completed',
  '--color-status-cancelled',
];
const STATUS_ICONS = ['--color-status-in-progress', '--color-status-completed', '--color-status-cancelled'];
// Smallest RGB distance between the in-progress blue and the navy signal color.
const MIN_BLUE_DISTANCE = 60;
const ICON_GROUNDS = [...GROUNDS, '--color-active-bg'];

// Text on filled signal controls and on pressed secondary controls, in every state.
const TEXT_PAIRS = [
  ['--color-on-signal', '--color-signal'],
  ['--color-on-signal', '--color-signal-hover'],
  ['--color-on-signal', '--color-signal-active'],
  ['--color-text', '--color-active-bg'],
  ['--color-link', '--color-active-bg'],
  ['--color-on-danger', '--color-danger'],
  ['--color-on-danger', '--color-danger-hover'],
  ['--color-on-danger', '--color-danger-active'],
];

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;

/**
 * Remove CSS comments, keeping their line breaks so line numbers stay put.
 * @param {string} css stylesheet text
 * @returns {string} the text without comments
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ''));
}

/**
 * Split stylesheet text into its top-level blocks.
 * @param {string} css stylesheet text without comments
 * @returns {{prelude: string, body: string}[]} each block's prelude and inner text
 */
function parseBlocks(css) {
  const blocks = [];
  let depth = 0;
  let start = 0;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) {
        open = i;
      }
      depth++;
    }
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        blocks.push({ prelude: css.slice(start, open).trim(), body: css.slice(open + 1, i) });
        start = i + 1;
      }
    }
    else if (css[i] === ';' && depth === 0) {
      start = i + 1;
    }
  }
  return blocks;
}

/**
 * Collect the custom property declarations of a block body.
 * @param {string} body block text without nested blocks
 * @returns {Map<string, string>} property name to raw value
 */
function declarations(body) {
  const result = new Map();
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    result.set(match[1], match[2].trim());
  }
  return result;
}

/**
 * Load the plain `:root` tokens and the `light-dark()` fallback block of tokens.css.
 * @returns {{tokens: Map<string, string>, fallback: Map<string, string>}} both declaration maps
 */
function loadTokens() {
  const blocks = parseBlocks(stripComments(readFileSync(TOKENS_FILE, 'utf8')));
  const tokens = new Map();
  let fallback = new Map();
  for (const block of blocks) {
    if (block.prelude === ':root') {
      for (const [name, value] of declarations(block.body)) {
        tokens.set(name, value);
      }
    }
    else if (/^@supports\s+not\s*\(\s*color\s*:\s*light-dark\(/.test(block.prelude)) {
      for (const inner of parseBlocks(block.body)) {
        fallback = new Map([...fallback, ...declarations(inner.body)]);
      }
    }
  }
  return { tokens, fallback };
}

/**
 * Split a function argument list at its top-level commas.
 * @param {string} args argument text
 * @returns {string[]} trimmed arguments
 */
function splitArgs(args) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of args) {
    if (char === '(') {
      depth++;
    }
    else if (char === ')') {
      depth--;
    }
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    }
    else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

/**
 * Follow a token through var() and light-dark() to its raw value for one theme.
 * @param {Map<string, string>} tokens declaration map
 * @param {string} value raw value or token name
 * @param {'light'|'dark'} theme theme to resolve `light-dark()` for
 * @returns {string} the raw value, such as a hex color
 */
function resolveRaw(tokens, value, theme) {
  let current = value.trim();
  for (let hops = 0; hops < 20; hops++) {
    if (current.startsWith('--')) {
      if (!tokens.has(current)) {
        throw new Error(`undefined token ${current}`);
      }
      current = tokens.get(current);
      continue;
    }
    const lightDark = current.match(/^light-dark\((.*)\)$/s);
    if (lightDark) {
      const [light, dark] = splitArgs(lightDark[1]);
      current = theme === 'light' ? light : dark;
      continue;
    }
    const variable = current.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (variable) {
      current = variable[1];
      continue;
    }
    return current;
  }
  throw new Error(`token chain too deep for ${value}`);
}

/**
 * Resolve a token to a hex color for one theme.
 * @param {Map<string, string>} tokens declaration map
 * @param {string} value raw value or token name
 * @param {'light'|'dark'} theme theme to resolve `light-dark()` for
 * @returns {string} the hex color in lowercase `#rrggbb` form
 */
function resolve(tokens, value, theme) {
  const raw = resolveRaw(tokens, value, theme);
  if (!/^#[0-9a-f]{6}$/i.test(raw)) {
    throw new Error(`${value} resolves to "${raw}", not a 6-digit hex color`);
  }
  return raw.toLowerCase();
}

/**
 * Compute the WCAG relative luminance of a hex color.
 * @param {string} hex color in `#rrggbb` form
 * @returns {number} luminance from 0 to 1
 */
function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute the WCAG contrast ratio of two hex colors.
 * @param {string} a first color
 * @param {string} b second color
 * @returns {number} ratio from 1 to 21
 */
function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * Compute the Euclidean distance of two hex colors in RGB space.
 * @param {string} a first color
 * @param {string} b second color
 * @returns {number} distance from 0 to about 441
 */
function distance(a, b) {
  const channels = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const [x, y] = [channels(a), channels(b)];
  return Math.hypot(...x.map((value, index) => value - y[index]));
}

describe('contrast helpers', () => {
  it('computes the known black on white ratio', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('resolves light-dark() through var() chains', () => {
    const tokens = new Map([
      ['--a', '#ffffff'],
      ['--b', '#000000'],
      ['--c', 'light-dark(var(--a), var(--b))'],
    ]);
    expect(resolve(tokens, '--c', 'light')).toBe('#ffffff');
    expect(resolve(tokens, '--c', 'dark')).toBe('#000000');
  });
});

describe('tokens.css', () => {
  it('exists in src/css', () => {
    expect(existsSync(TOKENS_FILE)).toBe(true);
  });

  for (const theme of THEMES) {
    describe(`${theme} theme`, () => {
      for (const text of TEXT_ON_GROUNDS) {
        for (const ground of GROUNDS) {
          it(`${text} on ${ground} reaches 4.5:1`, () => {
            const { tokens } = loadTokens();
            const ratio = contrast(resolve(tokens, text, theme), resolve(tokens, ground, theme));
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          });
        }
      }

      for (const [text, ground] of TEXT_PAIRS) {
        it(`${text} on ${ground} reaches 4.5:1`, () => {
          const { tokens } = loadTokens();
          const ratio = contrast(resolve(tokens, text, theme), resolve(tokens, ground, theme));
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      }

      for (const icon of ICONS) {
        for (const ground of ICON_GROUNDS) {
          it(`icon ${icon} on ${ground} reaches 3:1`, () => {
            const { tokens } = loadTokens();
            const ratio = contrast(resolve(tokens, icon, theme), resolve(tokens, ground, theme));
            expect(ratio).toBeGreaterThanOrEqual(3);
          });
        }
      }

      it('keeps the in-progress blue clearly apart from the signal navy', () => {
        const { tokens } = loadTokens();
        const blue = resolve(tokens, '--color-status-in-progress', theme);
        expect(distance(blue, resolve(tokens, '--color-signal', theme))).toBeGreaterThanOrEqual(MIN_BLUE_DISTANCE);
      });

      it('gives the three status colors three different colors', () => {
        const { tokens } = loadTokens();
        const colors = STATUS_ICONS.map((name) => resolve(tokens, name, theme));
        expect(new Set(colors).size).toBe(STATUS_ICONS.length);
      });

      for (const mark of NON_TEXT_ON_GROUNDS) {
        for (const ground of GROUNDS) {
          it(`${mark} on ${ground} reaches 3:1`, () => {
            const { tokens } = loadTokens();
            const ratio = contrast(resolve(tokens, mark, theme), resolve(tokens, ground, theme));
            expect(ratio).toBeGreaterThanOrEqual(3);
          });
        }
      }
    });
  }

  it('falls back to the light value of every light-dark() token', () => {
    const { tokens, fallback } = loadTokens();
    const themed = [...tokens].filter(([, value]) => value.startsWith('light-dark('));
    expect(themed.length).toBeGreaterThan(0);
    for (const [name] of themed) {
      expect(fallback.has(name), `${name} is missing from the fallback block`).toBe(true);
      expect(resolveRaw(tokens, fallback.get(name), 'light')).toBe(resolveRaw(tokens, name, 'light'));
    }
  });
});

describe('stylesheets outside tokens.css', () => {
  const sheets = () => [
    ...(existsSync(CSS_DIR) ? readdirSync(CSS_DIR) : [])
      .filter((name) => name.endsWith('.css') && name !== 'tokens.css')
      .map((name) => join(CSS_DIR, name)),
    ...(existsSync(DEMO_DIR) ? readdirSync(DEMO_DIR) : [])
      .filter((name) => name.endsWith('.css'))
      .map((name) => join(DEMO_DIR, name)),
  ];

  it('include style.css, fonts.css, controls.css, the app stylesheets, and the gallery stylesheet', () => {
    const names = sheets().map((path) => basename(path));
    expect(names).toEqual(
      expect.arrayContaining([
        'style.css',
        'fonts.css',
        'controls.css',
        'app-components.css',
        'app-chrome.css',
        'visual-style-gallery.css',
      ]),
    );
  });

  it('are imported by style.css in order: fonts, tokens, controls, app components, app chrome, app shell, then views', () => {
    const style = stripComments(readFileSync(join(CSS_DIR, 'style.css'), 'utf8'));
    const imports = [...style.matchAll(/@import\s+url\('([^']+)'\)/g)].map((match) => match[1]);
    expect(imports).toEqual(['fonts.css', 'tokens.css', 'controls.css', 'app-components.css', 'app-chrome.css', 'app-shell.css', 'views.css']);
  });

  for (const name of ['app-components.css', 'app-chrome.css', 'views.css']) {
    it(`scale no token by a bare number in ${name}, using size tokens instead`, () => {
      const path = join(CSS_DIR, name);
      const lines = existsSync(path) ? stripComments(readFileSync(path, 'utf8')).split('\n') : ['missing'];
      const offenders = lines.filter((line) => line === 'missing' || /var\(--[\w-]+\)\s*[*/]\s*-?\d|\d\s*\*\s*var\(/.test(line));
      expect(offenders.map((line) => line.trim())).toEqual([]);
    });
  }

  it('contain no raw color literals', () => {
    const offenders = [];
    for (const path of sheets()) {
      const lines = stripComments(readFileSync(path, 'utf8')).split('\n');
      lines.forEach((line, index) => {
        if (COLOR_LITERAL.test(line)) {
          offenders.push(`${basename(path)}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
