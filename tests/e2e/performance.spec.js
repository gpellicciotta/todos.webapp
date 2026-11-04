import { expect, test } from '@playwright/test';

// Performance with 5000 tasks (TEC-16): 400 ms on desktop Chromium stands in for 200 ms on a mid-range phone.
// The view opens once its first rows paint; the time until all rows painted is recorded too.

const COUNT = 5000;
const OPEN_BUDGET_MS = 400;
// A one-task change guards against rebuilding every row again, which took over 1 s before TEC-16 work.
const UPDATE_BUDGET_MS = 200;

/**
 * Store open tasks in one bulk write; every third task has a due time within ten days of now.
 * @param {import('@playwright/test').Page} page a page of the app
 * @param {number} count the number of tasks
 * @returns {Promise<string[]>} the task identifiers, in creation order
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
    return tasks.map((task) => task.id);
  }, count);
}

/**
 * Record, in every new document, when the first rows and then all expected rows have painted.
 * A timeout set in an animation frame callback runs once that frame has painted.
 * @param {number} expected the expected number of rows
 */
function watchRows(expected) {
  /** Check the rows in this frame, and again in the next one until they are all in place. */
  const check = () => {
    const count = document.querySelectorAll('.task-row').length;
    if (count > 0 && !window.firstRowsSeen) {
      window.firstRowsSeen = true;
      setTimeout(() => {
        window.firstRowsPainted = performance.now();
      });
    }
    if (count === expected) {
      setTimeout(() => {
        window.allRowsPainted = performance.now();
      });
    }
    else {
      requestAnimationFrame(check);
    }
  };
  requestAnimationFrame(check);
}

/**
 * Open All tasks from a blank page and return the times from navigation start until the first rows and all rows
 * have painted. Starting from a blank page leaves out the teardown of the previous app page, about 240 ms with
 * 5000 rows, which a reload would count although the browser spends it on the old page.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<{first: number, all: number}>} the times in milliseconds
 */
async function openToRows(page) {
  await page.goto('about:blank');
  await page.goto('/#/tasks');
  const handle = await page.waitForFunction(() => window.allRowsPainted
    && { first: window.firstRowsPainted, all: window.allRowsPainted }, null, { timeout: 20_000 });
  return handle.jsonValue();
}

/**
 * Return the median of three or more numbers.
 * @param {number[]} values the numbers
 * @returns {number} the median
 */
function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

test('All tasks shows 5000 tasks fast and updates one task fast (TEC-16)', async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  const ids = await seed(page, COUNT);
  await page.addInitScript(watchRows, COUNT);
  // The first opening warms the service worker and HTTP caches; the median of three more is the result.
  await openToRows(page);
  const opens = [];
  for (let run = 0; run < 3; run += 1) {
    opens.push(await openToRows(page));
  }
  const first = median(opens.map((times) => times.first));
  const all = median(opens.map((times) => times.all));

  const updates = [];
  for (let run = 0; run < 3; run += 1) {
    updates.push(await page.evaluate(async ({ id, text }) => {
      const { openStore } = await import('/js/store/db.js');
      const store = await openStore({ broadcast: true });
      const start = performance.now();
      await store.updateTask(id, { description: text });
      store.close();
      const description = () => document.querySelector(`.task-row[data-task-id="${id}"] .task-row__description`);
      while (description()?.textContent !== text) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      // The change counts once its frame has painted.
      await new Promise((resolve) => setTimeout(resolve));
      return performance.now() - start;
    }, { id: ids[run * 7], text: `Changed ${run}` }));
  }
  const update = median(updates);

  const round = (values) => values.map(Math.round).join(', ');
  const numbers = `first rows painted: ${round(opens.map((times) => times.first))} ms (median ${Math.round(first)} ms); `
    + `all ${COUNT} rows painted: ${round(opens.map((times) => times.all))} ms (median ${Math.round(all)} ms); `
    + `one-task update: ${round(updates)} ms (median ${Math.round(update)} ms)`;
  console.log(numbers);
  info.annotations.push({ type: 'performance', description: numbers });
  expect(first).toBeLessThan(OPEN_BUDGET_MS);
  expect(update).toBeLessThan(UPDATE_BUDGET_MS);
});
