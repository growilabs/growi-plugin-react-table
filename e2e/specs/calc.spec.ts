import { CALC_PAGE } from '../pages.ts';
import { expect, expectNoReactFailures, test } from '../test.ts';

test.describe('実ページ上の計算記法', () => {
  test('{vsum} などが計算される', async ({ page, consoleErrors }) => {
    await page.goto(CALC_PAGE.path);
    await expect(page.getByRole('table')).toBeVisible();

    const readGrid = () =>
      page.locator('table tbody tr').evaluateAll((rows) => rows.map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim() ?? '')));

    /*
     * GROWI paints the server-rendered markup — the raw `{hsum}` notation, unresolved —
     * before client hydration swaps in the plugin's computed values. `toEqual` does not
     * retry, so a one-shot read races that swap; poll instead.
     */
    await expect.poll(readGrid).toEqual([
      ['7', '13', '20'],
      ['15', '1', '8'],
      ['22', '13', ''],
    ]);

    expectNoReactFailures(consoleErrors);
  });

  test('計算が失敗しても本文が消えない', async ({ page, consoleErrors }) => {
    await page.goto(CALC_PAGE.path);

    /*
     * The reason the rehype plugin swallows its own exceptions: GROWI renders the whole
     * page body through one ReactMarkdown, so an escaping throw does not blank the table,
     * it blanks the article. The prose around the table is the canary.
     */
    await expect(page.getByRole('heading', { name: 'Calculation notation' })).toBeVisible();
    await expect(page.getByText('Text after the table.')).toBeVisible();

    expectNoReactFailures(consoleErrors);
  });
});
