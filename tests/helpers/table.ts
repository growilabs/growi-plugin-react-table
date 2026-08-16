import type { Locator, Page } from '@playwright/test';

/** The enhanced table inside a mock mount point. */
export const tableIn = (page: Page, mountId: string): Locator => page.locator(`#${mountId} table`);

/** Body cell text, row by row, in the order the table currently shows them. */
export const gridOf = async (table: Locator): Promise<string[][]> =>
  table.evaluate((element) =>
    [...element.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim() ?? '')),
  );

/** The values of one column, top to bottom. */
export const columnOf = async (table: Locator, index: number): Promise<string[]> => (await gridOf(table)).map((row) => row[index] ?? '');

/** The sort button in a header cell, which is what a click has to target. */
export const sortButton = (table: Locator, headerText: string): Locator => table.locator('thead th', { hasText: headerText }).getByRole('button');
