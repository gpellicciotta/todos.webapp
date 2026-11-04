import { expect, test } from '@playwright/test';

// The browser of every test reaches only the local server: playwright.config.js maps every other host name
// to "not found" and sends IP addresses to a dead proxy. The probes below use names and addresses that never
// belong to a real host: `*.localhost` resolves to the loopback address, and 192.0.2.1 is TEST-NET-1 (RFC 5737).

/**
 * Fetch a URL from the page and report how it ended.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} url the URL
 * @returns {Promise<string>} `reached`, `blocked` for a quick failure, or `timeout`
 */
function probe(page, url) {
  return page.evaluate(async (target) => {
    try {
      await fetch(target, { mode: 'no-cors', signal: AbortSignal.timeout(5000) });
      return 'reached';
    }
    catch (error) {
      return error.name === 'TimeoutError' ? 'timeout' : 'blocked';
    }
  }, url);
}

test('requests to any host but the local server fail at once', async ({ page, baseURL }) => {
  await page.goto('/');
  expect(await probe(page, `${baseURL}/index.html`)).toBe('reached');
  expect(await probe(page, baseURL.replace('127.0.0.1', 'guard.localhost'))).toBe('blocked');
  expect(await probe(page, 'http://192.0.2.1/')).toBe('blocked');
});
