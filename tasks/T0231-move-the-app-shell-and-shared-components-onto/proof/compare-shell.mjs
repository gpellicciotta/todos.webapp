// Compare two snapshot folders of capture.spec.js across the shell move of T0231.
// Usage: node compare-shell.mjs <before> <after> [--limit n] [--capture <name>]
// Element paths change when areas move, so each path is normalized before matching:
// moved subtrees re-root at a stable anchor, shell-only classes drop, and children of the shell root lose their index.
// Prints each differing normalized path and property with both values, and a summary per capture.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [before, after] = process.argv.slice(2, 4);
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const limit = Number(option('--limit', 40));
const only = option('--capture', null);

/** Classes that only the shell markup adds, beside the app's own classes. */
const SHELL_ONLY = new Set(['app--scroll-main', 'app__nav-item', 'app__nav-list', 'app__top-actions']);
/** Subtrees that move between areas, re-rooted at a stable anchor, by the class of their root. */
const ANCHORS = [
  ['app__banners', 'BANNERS'], ['add-block', 'ADD-BLOCK'], ['toast-region', 'TOASTS'], ['fab', 'FAB'],
  ['app__editor', 'PANEL'], ['app__side-panel', 'PANEL'], ['app__top-bar', 'TOP-BAR'], ['app__sidebar', 'SIDEBAR'],
  ['app__bottom-nav', 'BOTTOM-NAV'], ['app__main', 'MAIN'], ['app__view', 'VIEW'],
];
/** Parents whose children lose their index, since the add block and the floating button left them. */
const SHIFTED = ['task-view', 'lists-view'];

/**
 * Normalize one element path of a snapshot.
 * @param {string} path the structural path, segments `tag.class.class:n` joined by `>`
 * @returns {string} the normalized path
 */
function normalize(path) {
  const segments = path.split('>').map((segment) => {
    const [name, index] = segment.split(':');
    const [tag, ...classes] = name.split('.');
    return { tag, classes: classes.filter((item) => !SHELL_ONLY.has(item)), index };
  });
  let start = 0;
  let anchor = null;
  segments.forEach((segment, position) => {
    const found = ANCHORS.find(([name]) => segment.classes.includes(name));
    if (found) {
      start = position + 1;
      anchor = found[1];
    }
  });
  const rest = segments.slice(start).map((segment, position, list) => {
    const shifted = position > 0 && SHIFTED.some((name) => list[position - 1].classes.includes(name));
    return `${segment.tag}${segment.classes.length ? `.${segment.classes.join('.')}` : ''}${shifted ? '' : `:${segment.index}`}`;
  });
  return anchor ? [anchor, ...rest].join('>') : path;
}

/**
 * Read a snapshot and key it by normalized path.
 * @param {string} file the snapshot file
 * @returns {Map<string, object>} normalized path to entry
 */
function read(file) {
  const result = new Map();
  for (const [path, entry] of Object.entries(JSON.parse(readFileSync(file, 'utf8')))) {
    result.set(normalize(path), entry);
  }
  return result;
}

let total = 0;
for (const capture of readdirSync(before).filter((name) => !name.startsWith('.')).sort()) {
  for (const file of readdirSync(join(before, capture)).filter((name) => name.endsWith('.json') && name !== 'problems.json').sort()) {
    if (only && `${capture}/${file}` !== only) {
      continue;
    }
    const a = read(join(before, capture, file));
    const bPath = join(after, capture, file);
    if (!existsSync(bPath)) {
      console.log(`${capture}/${file}: missing after`);
      total += 1;
      continue;
    }
    const b = read(bPath);
    const lines = [];
    for (const key of new Set([...a.keys(), ...b.keys()])) {
      if (!a.has(key) || !b.has(key)) {
        lines.push(`  ${a.has(key) ? 'removed' : 'added'}: ${key}`);
        continue;
      }
      for (const prop of Object.keys(a.get(key))) {
        if (a.get(key)[prop] !== b.get(key)[prop]) {
          lines.push(`  ${key} ${prop}: ${a.get(key)[prop]} -> ${b.get(key)[prop]}`);
        }
      }
    }
    total += lines.length;
    console.log(`${capture}/${file}: ${lines.length} differences`);
    for (const line of lines.slice(0, limit)) {
      console.log(line);
    }
  }
}
console.log(`total differences: ${total}`);
process.exitCode = total ? 1 : 0;
