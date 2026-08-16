import { expect, test } from '@playwright/test';
import { gridOf, tableIn } from '../helpers/table';

/*
 * Compatibility tests for the `{vsum}` notation.
 *
 * The expected values below are growi-plugin-datatables' own, copied verbatim from its
 * tests/calc/calc-method.spec.ts — including the input grid. A page that renders one way
 * under that plugin has to render the same way under this one, so these are the contract
 * rather than a description of the implementation.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test.describe('計算記法', () => {
  test('datatables と同じ結果になる', async ({ page }) => {
    expect(await gridOf(tableIn(page, 'mock-calc'))).toEqual([
      ['7', '13', '2', '18', '4', '9', '53'],
      ['15', '1', '20', '6', '12', '8', '10.333333333333334'],
      ['5', '17', '3', '11', '19', '10', '19'],
      ['16', '14', '7', '8', '1', '20', '1'],
      ['9', '5', '10', '3', '17', '17', '17'],
      ['4', '16', '13', '2', '6', '15', '9.5'],
      // Column E holds each value once, so every value ties for most frequent and
      // mathjs returns them all — an array that stringifies to a comma-separated list.
      ['56', '11', '20', '2', '4,12,19,1,17,6', '12.5', ''],
    ]);
  });

  test('集計対象に数値が無いときは !CalcErr! になる', async ({ page }) => {
    /*
     * mathjs throws on an empty set for everything except sum. Left uncaught, that
     * exception escapes the rehype plugin and takes the whole page body with it, because
     * GROWI renders the body through a single ReactMarkdown.
     */
    expect(await gridOf(tableIn(page, 'mock-calc-error'))).toEqual([
      ['foo', 'bar', '!CalcErr!'],
      ['baz', 'qux', ''],
      ['0', '!CalcErr!', ''],
    ]);
  });

  test('マークアップを含むセルがあっても列がずれない', async ({ page }) => {
    /*
     * The grid the calculation reads is built one entry per cell. Reading text nodes
     * individually — as growi-plugin-datatables does — makes a cell with two text nodes
     * ("**b** and *c*") contribute two entries and shifts every column after it.
     */
    expect(await gridOf(tableIn(page, 'mock-calc-markup'))).toEqual([
      ['a', '3'],
      ['b and c', '4'],
      ['total', '7'],
    ]);
  });

  test('計算結果はフィルタで変わらない', async ({ page }) => {
    const container = page.locator('#mock-calc');
    const table = tableIn(page, 'mock-calc');

    await container.getByRole('button', { name: 'Search' }).click();
    await container.getByRole('searchbox', { name: 'Search this table' }).fill('56');

    /*
     * Deliberate, and the same as growi-plugin-datatables: the totals belong to the table
     * the author wrote. A sum that silently followed the reader's filter would be a
     * different number presented as the same one.
     */
    const rows = await gridOf(table);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(['56', '11', '20', '2', '4,12,19,1,17,6', '12.5', '']);
  });
});
