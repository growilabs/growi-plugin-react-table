import { expect, test } from '@playwright/test';
import type { BenchResult } from '../../src/bench/bench';

declare global {
  interface Window {
    __bench?: BenchResult;
  }
}

/*
 * Rendering cost, measured against bench.html.
 *
 * Timings are printed rather than asserted — they move with whatever else the machine is
 * doing, and a threshold would only teach people to re-run the suite. What is asserted is
 * countable: every row reaches the DOM, and a sort moves rows rather than adding them.
 * A change in rendering strategy then shows up as a number in the log and, if it is a
 * regression in behaviour, as a failure.
 */

const measure = async (page: import('@playwright/test').Page, query: string): Promise<BenchResult> => {
  await page.goto(`/bench.html?${query}`);
  await page.waitForFunction(() => window.__bench?.ready === true, undefined, { timeout: 60_000 });
  return (await page.evaluate(() => window.__bench)) as BenchResult;
};

test.describe('描画性能', () => {
  test('1テーブル 50行 x 3列', async ({ page }) => {
    const result = await measure(page, 'tables=1&rows=50&cols=3');

    console.info(`  1 table, 50x3: ${result.renderMs.toFixed(1)}ms`);
    expect(result.renderedRows).toBe(50);
  });

  test('10テーブル 50行 x 3列', async ({ page }) => {
    const result = await measure(page, 'tables=10&rows=50&cols=3');

    // Ten tables on one page is an ordinary long wiki article.
    console.info(`  10 tables, 50x3: ${result.renderMs.toFixed(1)}ms`);
    expect(result.renderedRows).toBe(500);
  });

  test('1テーブル 200行 x 10列', async ({ page }) => {
    const result = await measure(page, 'tables=1&rows=200&cols=10');

    console.info(`  1 table, 200x10: ${result.renderMs.toFixed(1)}ms`);
    expect(result.renderedRows).toBe(200);
  });

  test('ソートは行を作り直さず並べ替える', async ({ page }) => {
    await measure(page, 'tables=1&rows=50&cols=3');

    const rowsBefore = await page.locator('#bench-table-0 tbody tr').count();

    const started = await page.evaluate(() => performance.now());
    await page.locator('#bench-table-0 thead th', { hasText: 'col1' }).getByRole('button').click();
    await expect(page.locator('#bench-table-0 tbody tr').first().locator('td').first()).toHaveText('a1');
    const elapsed = (await page.evaluate(() => performance.now())) - started;

    console.info(`  sort 50 rows: ${elapsed.toFixed(1)}ms`);

    // Sorting reorders GROWI's original cells; it must not duplicate or drop any.
    expect(await page.locator('#bench-table-0 tbody tr').count()).toBe(rowsBefore);
  });
});
