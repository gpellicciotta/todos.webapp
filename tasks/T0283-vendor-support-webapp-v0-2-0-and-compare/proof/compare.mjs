// Compare two computed-style snapshot folders written by capture.spec.js.
// Usage: node compare.mjs <before> <after> [--props a,b,c] [--limit n]
// Prints each differing selector and property with both values, and a count per capture and screen.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [before, after] = process.argv.slice(2, 4);
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : fallback;
};
const only = option('--props', '') ? new Set(option('--props', '').split(',')) : null;
const limit = Number(option('--limit', 40));
let total = 0;
for (const capture of readdirSync(before).filter((name) => !name.startsWith('.')).sort()) {
  for (const file of readdirSync(join(before, capture)).filter((name) => name.endsWith('.json') && name !== 'problems.json').sort()) {
    const a = JSON.parse(readFileSync(join(before, capture, file), 'utf8'));
    const bPath = join(after, capture, file);
    if (!existsSync(bPath)) {
      console.log(`${capture}/${file}: missing after`);
      total += 1;
      continue;
    }
    const b = JSON.parse(readFileSync(bPath, 'utf8'));
    const lines = [];
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!a[key] || !b[key]) {
        lines.push(`  ${a[key] ? 'removed' : 'added'}: ${key}`);
        continue;
      }
      for (const prop of Object.keys(a[key]).filter((name) => !only || only.has(name))) {
        if (a[key][prop] !== b[key][prop]) {
          lines.push(`  ${key} ${prop}: ${a[key][prop]} -> ${b[key][prop]}`);
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
