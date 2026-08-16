import { expect, test } from '@playwright/test';

const container = (page: import('@playwright/test').Page) => page.locator('#mock-basic');

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/index.html');
});

test.describe('エクスポート', () => {
  test('見えている表をクリップボードにコピーする', async ({ page }) => {
    await container(page).getByRole('button', { name: 'Export' }).click();
    await container(page).getByRole('button', { name: 'Copy to clipboard' }).click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    const rows = clipboard.split('\n');

    // Tab-separated, because that is what a spreadsheet accepts from the clipboard.
    expect(rows[0]).toBe('Name\tType\tLength');
    expect(rows).toHaveLength(6);
    expect(rows[1]).toBe('Zebra\therbivore\t2.4m');
  });

  test('フィルタで隠れた行はコピーされない', async ({ page }) => {
    await container(page).getByRole('button', { name: 'Search' }).click();
    await container(page).getByRole('searchbox', { name: 'Search this table' }).fill('carnivore');

    await container(page).getByRole('button', { name: 'Export' }).click();
    await container(page).getByRole('button', { name: 'Copy to clipboard' }).click();

    /*
     * What you see is what you get. An export that quietly brought back the rows the
     * reader had filtered away would be a different table from the one on screen.
     */
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard.split('\n')).toHaveLength(3);
    expect(clipboard).not.toContain('Zebra');
  });

  test('隠した列はコピーされない', async ({ page }) => {
    await container(page).getByRole('button', { name: 'Columns', exact: true }).click();
    await container(page).getByRole('checkbox', { name: 'Type' }).uncheck();
    await page.keyboard.press('Escape');

    await container(page).getByRole('button', { name: 'Export' }).click();
    await container(page).getByRole('button', { name: 'Copy to clipboard' }).click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard.split('\n')[0]).toBe('Name\tLength');
  });

  test('CSV としてダウンロードできる', async ({ page }) => {
    await container(page).getByRole('button', { name: 'Export' }).click();

    const download = page.waitForEvent('download');
    await container(page).getByRole('button', { name: 'Download as CSV' }).click();

    const file = await download;
    expect(file.suggestedFilename()).toBe('table.csv');

    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const csv = Buffer.concat(chunks).toString('utf-8');

    expect(csv.split('\r\n')[0]).toBe('Name,Type,Length');
    expect(csv).toContain('Anaconda,carnivore,10.9m');
  });
});
