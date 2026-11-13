#!/usr/bin/env node
// Standalone checker: only Node built-ins may be imported here.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export function inside(root, name) {
    const base = resolve(root);
    const result = resolve(base, name);
    const rel = relative(base, result);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error(`Path must stay inside its root: ${name}`);
    }
    let current = result;
    while (current !== base && dirname(current) !== current) {
        if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
            throw new Error(`Symbolic links are not supported: ${name}`);
        }
        current = dirname(current);
    }
    return result;
}

export function walk(root) {
    const files = [];
    for (const item of readdirSync(root, { withFileTypes: true })) {
        const path = inside(root, item.name);
        if (item.isDirectory()) {
            files.push(...walk(path));
        }
        else {
            files.push(path);
        }
    }
    return files;
}

export function scanStyles(css, path, contract, primitives) {
    const errors = [];
    const warnings = [];
    const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // A token never follows a name character, so BEM classes such as .card--gray-50 are skipped.
    const tokens = text.match(/(?<![\w-])--[\w-]+/g) ?? [];
    for (const token of new Set(tokens)) {
        if (token.startsWith('--_') || primitives.includes(token)) {
            errors.push(`${path}: package internal token ${token}`);
        }
        const deprecated = contract.deprecated ?? [];
        if ((Array.isArray(deprecated) ? deprecated.some(item => (item.name ?? item) === token) : Object.hasOwn(deprecated, token)) || contract.tokens?.some(item => item.name === token && item.deprecated)) {
            warnings.push(`${path}: deprecated token ${token}`);
        }
    }
    const tokenFile = /^(tokens|primitives|look)\.css$/i.test(basename(path));
    // Color keywords are checked in declaration values, avoiding selectors and URLs.
    const values = [...text.matchAll(/(?:^|[;{])\s*([\w-]+)\s*:\s*([^;{}]+)/g)];
    const colorNames = /\b(?:aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)\b/i;
    for (const [, property, value] of values) {
        const cleaned = value.replace(/url\([^)]*\)|var\(\s*--[\w-]+\s*\)|["'][^"']*["']/gi, '');
        if (!tokenFile && (/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/i.test(cleaned) || (/color|background|border|shadow|outline|fill|stroke|^--/i.test(property) && colorNames.test(cleaned)))) {
            errors.push(`${path}: raw color in ${property}`);
        }
        if (property.toLowerCase() === 'position' && /\b(fixed|sticky)\b/i.test(value) && !/(^|[/\\])shell(?:[/\\]|\.css$)/.test(path)) {
            warnings.push(`${path}: fixed or sticky position outside shell`);
        }
    }
    return { errors, warnings };
}

export function check(appRoot, pinPath = join(appRoot, 'design.json')) {
    const pin = JSON.parse(readFileSync(pinPath));
    if (typeof pin.version !== 'string' || typeof pin.look !== 'string' || typeof pin.target !== 'string' || !Array.isArray(pin.styles) || pin.styles.some(value => typeof value !== 'string')) {
        throw new Error('Invalid design.json: expected version, look, target, and styles');
    }
    const target = inside(appRoot, pin.target);
    const manifest = JSON.parse(readFileSync(join(target, 'manifest.json')));
    const integrity = { errors: [], warnings: [] };
    const conformance = { errors: [], warnings: [] };
    if (pin.version !== manifest.version) {
        integrity.errors.push('Pin version differs from manifest version');
    }
    const selected = Object.entries(manifest.files).filter(([, entry]) => entry.look === null || entry.look === pin.look);
    if (!selected.some(([, entry]) => entry.look === pin.look)) {
        integrity.errors.push(`Unknown look: ${pin.look}`);
    }
    const expected = new Set(['manifest.json', ...selected.map(([path]) => path)]);
    for (const [path, entry] of selected) {
        const file = inside(target, path);
        if (!existsSync(file)) {
            integrity.errors.push(`Missing file: ${path}`);
        }
        else if (!lstatSync(file).isFile() || createHash('sha256').update(readFileSync(file)).digest('hex') !== entry.sha256) {
            integrity.errors.push(`Changed file: ${path}`);
        }
    }
    for (const path of walk(target)) {
        const name = relative(target, path).replaceAll('\\', '/');
        if (!expected.has(name)) {
            integrity.errors.push(`Unlisted file: ${name}`);
        }
    }
    const contract = JSON.parse(readFileSync(join(target, 'contract.json')));
    const primitives = [];
    for (const [name] of selected.filter(([name]) => /\/primitives\.css$/.test(name))) {
        if (existsSync(inside(target, name))) {
            primitives.push(...[...readFileSync(inside(target, name), 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
        }
    }
    const seen = new Set();
    // Integrity covers the vendored copy, so a styles folder that contains it skips it here.
    const vendored = file => !relative(target, file).startsWith('..') && !isAbsolute(relative(target, file));
    for (const folder of pin.styles) {
        const styles = inside(appRoot, folder);
        if (!existsSync(styles)) {
            conformance.errors.push(`Missing styles folder: ${folder}`);
            continue;
        }
        for (const file of walk(styles)) {
            if (file.endsWith('.css') && !seen.has(file) && !vendored(file)) {
                seen.add(file);
                const result = scanStyles(readFileSync(file, 'utf8'), relative(appRoot, file).replaceAll('\\', '/'), contract, primitives);
                conformance.errors.push(...result.errors);
                conformance.warnings.push(...result.warnings);
            }
        }
    }
    return { integrity, conformance, ok: integrity.errors.length + conformance.errors.length === 0 };
}

export function printResult(result, format = 'text') {
    if (format === 'json') {
        console.log(JSON.stringify(result));
    }
    else {
        for (const job of ['integrity', 'conformance']) {
            console.log(`${job}: ${result[job].errors.length ? 'FAIL' : 'PASS'}`);
        }
    }
    for (const job of ['integrity', 'conformance']) {
        for (const message of [...result[job].errors, ...result[job].warnings]) {
            console.error(message);
        }
    }
    return result.ok ? 0 : 1;
}

// Real paths keep the guard true when the script runs through a symbolic link or junction.
function isMain(url) {
    try {
        return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url));
    }
    catch {
        return false;
    }
}

if (isMain(import.meta.url)) {
    try {
        const args = process.argv.slice(2);
        if (args.includes('--help') || args.includes('-h')) {
            console.log('Check vendored integrity and app styles. Usage: node bin/check.mjs [--format text|json]\nExit codes: 0 success, 1 check failure, 2 invalid arguments.');
        }
        else if (args.length && !(args.length === 2 && args[0] === '--format' && ['text', 'json'].includes(args[1]))) {
            console.error('Usage: node bin/check.mjs [--format text|json]');
            process.exitCode = 2;
        }
        else {
            const target = resolve(dirname(fileURLToPath(import.meta.url)), '..');
            let root = target;
            while (!existsSync(join(root, 'design.json')) && dirname(root) !== root) {
                root = dirname(root);
            }
            const pin = JSON.parse(readFileSync(join(root, 'design.json')));
            if (inside(root, pin.target) !== target) {
                throw new Error('design.json target does not match this checker');
            }
            process.exitCode = printResult(check(root), args[1]);
        }
    }
    catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
