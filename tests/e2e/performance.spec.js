import { expect, test } from '@playwright/test';

// Performance with 5000 tasks (TEC-16): views open within 200 ms on a mid-range phone.
// Chromium's CPU throttling through CDP stands in for the phone: rate 4 is the mid-range mobile preset of DevTools.
// A view opens once its first rows paint, measured from the route change; the cold app start is recorded too.

const COUNT = 5000;
const CPU_RATE = 4;
const OPEN_BUDGET_MS = 200;
// A one-task change, unthrottled, guards against rebuilding every row again, which took over 1 s before TEC-16 work.
// Under throttling it is recorded only: it reads the whole store again, which TEC-16 does not cover.
const UPDATE_BUDGET_MS = 200;
// The scroll run moves the main column this far each frame, so 300 frames cross 2500 rows.
const SCROLL_STEP_PX = 400;
const SCROLL_FRAMES = 300;

/**
 * Store open tasks in one bulk write; every third task has a due time within ten days of now.
 * @param {import('@playwright/test').Page} page a page of the app
 * @param {number} count the number of tasks
 * @returns {Promise<void>}
 */
async function seed(page, count) {
  return page.evaluate(async (total) => {
    const { openStore } = await import('/js/store/db.js');
    const { uuid7 } = await import('/js/lib/uuid7.js');
    const store = await openStore({ broadcast: true });
    const time = new Date().toISOString();
    const tasks = Array.from({ length: total }, (_, index) => ({
      id: uuid7(),
      description: `Task ${String(index).padStart(4, '0')}`,
      status: 'todo',
      'due-time': index % 3 === 0 ? new Date(Date.now() + ((index % 20) - 10) * 86_400_000).toISOString() : null,
      'overdue-handling': 'keep',
      'owner-id': null,
      'creation-time': time,
      'last-update-time': time,
      'last-activity-time': time,
      'deletion-time': null,
    }));
    await store.applyChanges(() => ({ changes: { put: { tasks } }, result: null }));
    store.close();
  }, count);
}

/**
 * Record, in every new document, when the first rows have painted.
 * A timeout set in an animation frame callback runs once that frame has painted.
 */
function watchRows() {
  /** Check for rows in this frame, and again in the next one until they show. */
  const check = () => {
    if (document.querySelector('.task-row')) {
      setTimeout(() => {
        window.firstRowsPainted = performance.now();
      });
    }
    else {
      requestAnimationFrame(check);
    }
  };
  requestAnimationFrame(check);
}

/**
 * Start the app from a blank page and return the time from navigation start until the first rows painted.
 * Starting from a blank page leaves out the teardown of the previous app page, which the browser spends on the old page.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<number>} the time in milliseconds
 */
async function startToRows(page) {
  await page.goto('about:blank');
  await page.goto('/#/tasks');
  const handle = await page.waitForFunction(() => window.firstRowsPainted, null, { timeout: 30_000 });
  return handle.jsonValue();
}

/**
 * Open All tasks from the Lists screen and return the time from the route change until the first rows painted.
 * @param {import('@playwright/test').Page} page the page, with the app started
 * @returns {Promise<number>} the time in milliseconds
 */
async function openToRows(page) {
  await page.evaluate(() => {
    location.hash = '#/lists';
  });
  await expect(page.locator('[data-view="lists"]')).toHaveCount(1);
  await expect(page.locator('.task-row')).toHaveCount(0);
  return page.evaluate(async () => {
    const start = performance.now();
    location.hash = '#/tasks';
    while (!document.querySelector('.task-row')) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    await new Promise((resolve) => setTimeout(resolve));
    return performance.now() - start;
  });
}

/**
 * Change one task's description and return the time until its row painted the change.
 * @param {import('@playwright/test').Page} page the page, showing All tasks from the top
 * @param {string} id the task identifier
 * @param {string} text the new description
 * @returns {Promise<number>} the time in milliseconds
 */
function updateToRow(page, id, text) {
  return page.evaluate(async ({ taskId, description }) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const start = performance.now();
    await store.updateTask(taskId, { description });
    store.close();
    const shown = () => document.querySelector(`.task-row[data-task-id="${taskId}"] .task-row__description`);
    while (shown()?.textContent !== description) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    // The change counts once its frame has painted.
    await new Promise((resolve) => setTimeout(resolve));
    return performance.now() - start;
  }, { taskId: id, description: text });
}

/**
 * Scroll the main column down a fixed step every frame and return the frame times.
 * @param {import('@playwright/test').Page} page the page, showing All tasks
 * @returns {Promise<{median: number, p95: number, slow: number, rows: number}>} the median and 95th percentile
 *   frame time in milliseconds, the frames over 50 ms, and the most rows in the DOM during the run
 */
function scrollFrames(page) {
  return page.evaluate(async ({ step, frames }) => {
    const main = document.querySelector('.app__main');
    main.scrollTop = 0;
    const times = [];
    let rows = 0;
    let last = await new Promise((resolve) => requestAnimationFrame(resolve));
    for (let frame = 0; frame < frames; frame += 1) {
      main.scrollTop += step;
      const now = await new Promise((resolve) => requestAnimationFrame(resolve));
      times.push(now - last);
      last = now;
      rows = Math.max(rows, document.querySelectorAll('.task-row').length);
    }
    main.scrollTop = 0;
    const sorted = [...times].sort((a, b) => a - b);
    return {
      median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.floor(sorted.length * 0.95)],
      slow: times.filter((time) => time > 50).length, rows,
    };
  }, { step: SCROLL_STEP_PX, frames: SCROLL_FRAMES });
}

/**
 * Return the median of three or more numbers.
 * @param {number[]} values the numbers
 * @returns {number} the median
 */
function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

/**
 * Measure the cold start, three view openings, three one-task updates, and a scroll run.
 * @param {import('@playwright/test').Page} page the page, with the tasks stored
 * @param {string} label the run label, for the changed descriptions
 * @returns {Promise<{starts: number[], warmOpen: number, opens: number[], updates: number[], scroll: object}>} the times
 *   in milliseconds
 */
async function measure(page, label) {
  // The first start warms the service worker and HTTP caches; the median of three more is the result.
  await startToRows(page);
  const starts = [];
  for (let run = 0; run < 3; run += 1) {
    starts.push(await startToRows(page));
  }
  // The first opening after a start is a warm-up too, since start-up maintenance may still run; it is recorded.
  const warmOpen = await openToRows(page);
  const opens = [];
  for (let run = 0; run < 3; run += 1) {
    opens.push(await openToRows(page));
  }
  // The updated tasks are the first rows shown, so they are on screen in every build.
  const ids = await page.locator('.task-row').evaluateAll((rows) => rows.slice(0, 3).map((row) => row.dataset.taskId));
  const updates = [];
  for (let run = 0; run < 3; run += 1) {
    updates.push(await updateToRow(page, ids[run], `Changed ${label} ${run}`));
  }
  return { starts, warmOpen, opens, updates, scroll: await scrollFrames(page) };
}

/**
 * Describe the numbers of a run on one line.
 * @param {string} label the run label
 * @param {object} times the result of `measure`
 * @returns {string} the description
 */
function describe(label, { starts, warmOpen, opens, updates, scroll }) {
  const round = (values) => `${values.map(Math.round).join(', ')} ms (median ${Math.round(median(values))} ms)`;
  return `${label}: view open ${round(opens)}, warm-up ${Math.round(warmOpen)} ms; cold start to first rows ${round(starts)}; `
    + `one-task update ${round(updates)}; scroll frames median ${Math.round(scroll.median)} ms, `
    + `p95 ${Math.round(scroll.p95)} ms, ${scroll.slow} of ${SCROLL_FRAMES} over 50 ms, at most ${scroll.rows} rows`;
}

test('All tasks opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16)', async ({ page }, info) => {
  test.setTimeout(240_000);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await seed(page, COUNT);
  await page.addInitScript(watchRows);
  const desktop = await measure(page, 'desktop');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
  const phone = await measure(page, 'throttled');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const numbers = `${describe('desktop', desktop)}\n${describe(`${CPU_RATE}x CPU throttling`, phone)}`;
  console.log(numbers);
  info.annotations.push({ type: 'performance', description: numbers });
  expect(median(phone.opens)).toBeLessThan(OPEN_BUDGET_MS);
  expect(median(desktop.updates)).toBeLessThan(UPDATE_BUDGET_MS);
});

/**
 * Open All tasks four times under CPU throttling with a grouping, and return the three last opening times.
 * @param {import('@playwright/test').Page} page the page, with the tasks stored
 * @param {import('@playwright/test').CDPSession} cdp the throttling session
 * @param {string} group the grouping, `none`, `list`, `due`, or `status`
 * @returns {Promise<number[]>} the times in milliseconds
 */
async function opensGrouped(page, cdp, group) {
  await page.evaluate((value) => localStorage.setItem('todos.view.tasks', JSON.stringify({ group: value })), group);
  await page.goto('about:blank');
  await page.goto('/#/tasks');
  await page.waitForFunction(() => window.firstRowsPainted, null, { timeout: 30_000 });
  expect(await page.locator('.group-header').count() > 0).toBe(group !== 'none');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
  const opens = [];
  for (let run = 0; run < 4; run += 1) {
    opens.push(await openToRows(page));
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return opens.slice(1);
}

test('All tasks grouped by due date opens with 5000 tasks within 200 ms under 4x CPU throttling (TEC-16, VO-9)', async ({ page }, info) => {
  test.setTimeout(240_000);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await seed(page, COUNT);
  await page.addInitScript(watchRows);
  const cdp = await page.context().newCDPSession(page);
  const opens = await opensGrouped(page, cdp, 'due');
  const scroll = await scrollFrames(page);
  const numbers = `grouped by due date, ${CPU_RATE}x CPU throttling: view open ${opens.map(Math.round).join(', ')} ms `
    + `(median ${Math.round(median(opens))} ms); scroll frames median ${Math.round(scroll.median)} ms, `
    + `p95 ${Math.round(scroll.p95)} ms, at most ${scroll.rows} rows`;
  console.log(numbers);
  info.annotations.push({ type: 'performance', description: numbers });
  expect(median(opens)).toBeLessThan(OPEN_BUDGET_MS);
});

// The lists and their memberships add store reads that no grouping causes, so this test compares the two openings
// on the same data instead of judging the 200 ms budget, which the test above covers for the standard data.
test('grouping 5000 tasks by list in 12 lists opens as fast as showing them ungrouped (TEC-16, VO-9)', async ({ page }, info) => {
  test.setTimeout(240_000);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await seed(page, COUNT);
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const { uuid7 } = await import('/js/lib/uuid7.js');
    const store = await openStore({ broadcast: true });
    const time = new Date().toISOString();
    const lists = Array.from({ length: 12 }, (_, index) => ({
      id: uuid7(), name: `List ${String(index).padStart(2, '0')}`, description: '', owner: null,
      'creation-time': time, 'last-update-time': time, 'deletion-time': null,
    }));
    const tasks = await store.listTasks();
    const memberships = tasks.flatMap((task, index) => [
      ...(index % 4 === 3 ? [] : [{ 'list-id': lists[index % 12].id, 'task-id': task.id, position: 'a', 'added-time': time }]),
      ...(index % 10 === 0 ? [{ 'list-id': lists[(index + 5) % 12].id, 'task-id': task.id, position: 'a', 'added-time': time }] : []),
    ]);
    await store.applyChanges(() => ({ changes: { put: { lists, memberships } }, result: null }));
    store.close();
  });
  await page.addInitScript(watchRows);
  const cdp = await page.context().newCDPSession(page);
  const plain = [];
  const grouped = [];
  // The runs alternate, so a change of machine load hits both sides.
  for (let pass = 0; pass < 3; pass += 1) {
    plain.push(...await opensGrouped(page, cdp, 'none'));
    grouped.push(...await opensGrouped(page, cdp, 'list'));
  }
  const numbers = `${CPU_RATE}x CPU throttling, 12 lists: ungrouped median ${Math.round(median(plain))} ms (${plain.map(Math.round).join(', ')}); `
    + `grouped by list median ${Math.round(median(grouped))} ms (${grouped.map(Math.round).join(', ')})`;
  console.log(numbers);
  info.annotations.push({ type: 'performance', description: numbers });
  expect(median(grouped)).toBeLessThan(median(plain) * 1.25 + 30);
});
