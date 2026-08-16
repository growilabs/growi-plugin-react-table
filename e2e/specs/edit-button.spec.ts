import { BASIC_TABLE_PAGE, RICH_CELL_PAGE } from '../pages.ts';
import { expect, expectNoReactFailures, test } from '../test.ts';

const EDIT_BUTTON = '.editable-with-handsontable .handsontable-modal-trigger';

/*
 * GROWI draws an "edit this table" button absolutely positioned over the top-right of
 * every table, for users who may edit. Anything the plugin puts near there can cover it,
 * and a covered button looks exactly like a working one.
 *
 * growi-plugin-datatables shipped that bug: DataTables relocates the table into its own
 * container, which then sat over the button. This plugin never moves the table, and these
 * tests are what keeps that true against the real component rather than a copy of it.
 */
test.describe('GROWI の編集ボタン', () => {
  test('管理者には編集ボタンが出る', async ({ page }) => {
    await page.goto(BASIC_TABLE_PAGE.path);
    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toBeVisible();

    await expect(page.locator(EDIT_BUTTON).first()).toBeAttached();
  });

  test('編集ボタンがプラグインの UI に覆われていない', async ({ page, consoleErrors }) => {
    await page.goto(BASIC_TABLE_PAGE.path);
    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toBeVisible();

    const button = page.locator(EDIT_BUTTON).first();
    await button.hover();
    const box = (await button.boundingBox())!;

    const topmost = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.handsontable-modal-trigger') != null, {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    });

    expect(topmost, 'something is stacked over GROWI’s edit button').toBe(true);
    expectNoReactFailures(consoleErrors);
  });

  test('ツールバーは表の上に置かれる', async ({ page }) => {
    await page.goto(RICH_CELL_PAGE.path);
    await expect(page.locator('[data-growi-plugin-react-table="active"]')).toBeVisible();

    const toolbar = (await page.locator('.grt-toolbar').first().boundingBox())!;
    const table = (await page.getByRole('table').first().boundingBox())!;

    // Sitting above the table rather than floating over its corner is the whole reason
    // the toolbar and the edit button do not fight.
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(table.y + 1);
  });
});
