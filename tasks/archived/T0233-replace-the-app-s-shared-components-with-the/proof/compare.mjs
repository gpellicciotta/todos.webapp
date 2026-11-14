// Compare two computed-style snapshot folders written by capture.spec.js.
// Usage: node compare.mjs <before> <after> [--limit n]
// Prints each differing element path and property with both values, and a summary per capture.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [before, after] = process.argv.slice(2, 4);
const limitIndex = process.argv.indexOf('--limit');
const limit = limitIndex > 0 ? Number(process.argv[limitIndex + 1]) : 40;
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
      for (const prop of Object.keys(a[key])) {
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
