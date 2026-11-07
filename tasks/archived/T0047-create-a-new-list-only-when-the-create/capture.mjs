import { chromium } from 'playwright';
const phase = process.argv[2];
const browser = await chromium.launch();
const problems = [];
for (const width of [390, 1440]) {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' });
    page.on('console', msg => { if (msg.type() === 'error') { problems.push(msg.text()); } });
    page.on('pageerror', err => problems.push(err.message));
    page.on('requestfailed', req => problems.push(req.url()));
    page.on('response', res => { if (res.status() >= 400) { problems.push(`${res.status()} ${res.url()}`); } });
    const response = await page.goto('http://127.0.0.1:8756/#/lists/new');
    if (response.status() !== 200) { throw new Error(`HTTP ${response.status()}`); }
    await page.locator('[data-editor-slot] input[name="name"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `.plan/tasks/T0047-create-a-new-list-only-when-the-create/${phase}-${width}-${theme}.png` });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) { problems.push(`overflow at ${width}`); }
    await page.close();
  }
}
await browser.close();
console.log(`${phase}: captured new-list editor at 390/1440 px in light/dark themes.`);
console.log(JSON.stringify(problems));
if (problems.length) { process.exitCode = 1; }
