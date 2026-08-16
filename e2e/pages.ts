/**
 * Pages the integration suite creates in GROWI.
 *
 * Markdown, not HTML: the point of these tests is that the plugin survives GROWI's own
 * remark/rehype pipeline, so the input has to enter at the same place a real page does.
 */
export type Fixture = {
  path: string;
  body: string;
};

export const BASIC_TABLE_PAGE: Fixture = {
  path: '/e2e/basic-table',
  body: `# Basic table

| Name | Type | Length |
| --- | --- | --- |
| Zebra | herbivore | 2.4m |
| Anaconda | carnivore | 10.9m |
| Meerkat | carnivore | 0.35m |
| Giraffe | herbivore | 4.5m |
| Capybara | herbivore | 1.3m |

Text after the table.
`,
};

export const RICH_CELL_PAGE: Fixture = {
  path: '/e2e/rich-cell-table',
  body: `# Rich cells

| Page | Note |
| --- | --- |
| [beta](/beta) | \`npm run beta\` |
| [alpha](/alpha) | **ready** |
| [gamma](/gamma) | *draft* |
`,
};

export const TINY_TABLE_PAGE: Fixture = {
  path: '/e2e/tiny-table',
  body: `# Tiny table

| Key | Value |
| --- | --- |
| version | 1 |
`,
};

export const CALC_PAGE: Fixture = {
  path: '/e2e/calc-table',
  body: `# Calculation notation

| A | B | C |
| --- | --- | --- |
| 7 | 13 | {hsum} |
| 15 | 1 | {havg} |
| {vsum} | {vmax} | |

Text after the table.
`,
};

export const ALL_FIXTURES: Fixture[] = [BASIC_TABLE_PAGE, RICH_CELL_PAGE, TINY_TABLE_PAGE, CALC_PAGE];
