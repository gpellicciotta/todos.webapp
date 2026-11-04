#!/usr/bin/env node
/**
 * Render the PNG app icons of the manifest from src/img/app-icon.svg, with Playwright's Chromium.
 *
 * Usage: node scripts/render-app-icons.mjs
 * Writes src/img/app-icon-192.png and src/img/app-icon-512.png; rerun it after changing the SVG.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const IMG = fileURLToPath(new URL('../src/img/', import.meta.url));
const SIZES = [192, 512];

/**
 * Render the icon at every size.
 * @returns {Promise<void>}
 */
async function main() {
  const svg = await readFile(`${IMG}app-icon.svg`, 'utf8');
  const browser = await chromium.launch();
  try {
    for (const size of SIZES) {
      const page = await browser.newPage({ viewport: { width: size, height: size } });
      await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
      await page.screenshot({ path: `${IMG}app-icon-${size}.png`, omitBackground: true });
      await page.close();
      console.log(`Wrote src/img/app-icon-${size}.png`);
    }
  }
  finally {
    await browser.close();
  }
}

main();
