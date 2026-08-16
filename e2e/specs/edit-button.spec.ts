import type { Locator } from '@playwright/test';
import { BASIC_TABLE_PAGE, RICH_CELL_PAGE } from '../pages.ts';
import { expect, expectNoReactFailures, test } from '../test.ts';

const EDIT_BUTTON = '.editable-with-handsontable .handsontable-modal-trigger';

/*
 * `boundingBox()` intermittently returns `null` right after the enhanced table mounts,
 * even though the element is present and visible (`toBeVisible()` just resolved, and a
 * direct DOM check finds exactly one, rendered, non-zero-size element). Poll past that
 * instant instead of trusting one read.
 */
const stableBox = async (locator: Locator) => {
  let box: Awaited<ReturnType<Locator['boundingBox']>> = null;
  await expect
    .poll(async () => {
      box = await locator.boundingBox();
      return box != null;
    })
    .toBe(true);
  return box!;
};

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
    const box = await stableBox(button);

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
    await expect(page.getByRole('table').first()).toBeVisible();

    const toolbar = await stableBox(page.locator('.grt-toolbar').first());
    const table = await stableBox(page.getByRole('table').first());

    // Sitting above the table rather than floating over its corner is the whole reason
    // the toolbar and the edit button do not fight.
    expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(table.y + 1);
  });
});
