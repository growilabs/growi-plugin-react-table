/**
 * HTML fragments standing in for what GROWI's markdown pipeline emits for a GFM table.
 */

/** Values are deliberately out of natural order so a sort is visible. */
export const BASIC_TABLE = `
<table>
  <thead>
    <tr><th>Name</th><th>Type</th><th>Length</th></tr>
  </thead>
  <tbody>
    <tr><td>Zebra</td><td>herbivore</td><td>2.4m</td></tr>
    <tr><td>Anaconda</td><td>carnivore</td><td>10.9m</td></tr>
    <tr><td>Meerkat</td><td>carnivore</td><td>0.35m</td></tr>
    <tr><td>Giraffe</td><td>herbivore</td><td>4.5m</td></tr>
    <tr><td>Capybara</td><td>herbivore</td><td>1.3m</td></tr>
  </tbody>
</table>
`;

/** Cells with markup: sorting must move these intact, not flatten them to text. */
export const RICH_CELL_TABLE = `
<table>
  <thead>
    <tr><th>Page</th><th>Note</th></tr>
  </thead>
  <tbody>
    <tr><td><a href="/beta">beta</a></td><td><code>npm run beta</code></td></tr>
    <tr><td><a href="/alpha">alpha</a></td><td><strong>ready</strong></td></tr>
    <tr><td><a href="/gamma">gamma</a></td><td><em>draft</em></td></tr>
  </tbody>
</table>
`;

/** Too small to be worth a toolbar: the plugin must leave it alone. */
export const TINY_TABLE = `
<table>
  <thead>
    <tr><th>Key</th><th>Value</th></tr>
  </thead>
  <tbody>
    <tr><td>version</td><td>1</td></tr>
  </tbody>
</table>
`;

/** No <thead> at all — raw HTML in markdown can look like this. */
export const HEADERLESS_TABLE = `
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>c</td><td>d</td></tr>
    <tr><td>e</td><td>f</td></tr>
  </tbody>
</table>
`;

/**
 * The exact grid growi-plugin-datatables uses in its own calculation test.
 *
 * Keeping the input identical is what lets tests/calc assert the same expected values,
 * which is the compatibility guarantee for the `{vsum}` notation.
 */
export const CALC_TABLE = `
<table>
  <thead>
    <tr><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>G</th></tr>
  </thead>
  <tbody>
    <tr><td>7</td><td>13</td><td>2</td><td>18</td><td>4</td><td>9</td><td>{hsum}</td></tr>
    <tr><td>15</td><td>1</td><td>20</td><td>6</td><td>12</td><td>8</td><td>{havg}</td></tr>
    <tr><td>5</td><td>17</td><td>3</td><td>11</td><td>19</td><td>10</td><td>{hmax}</td></tr>
    <tr><td>16</td><td>14</td><td>7</td><td>8</td><td>1</td><td>20</td><td>{hmin}</td></tr>
    <tr><td>9</td><td>5</td><td>10</td><td>3</td><td>17</td><td>17</td><td>{hmode}</td></tr>
    <tr><td>4</td><td>16</td><td>13</td><td>2</td><td>6</td><td>15</td><td>{hmedian}</td></tr>
    <tr><td>{vsum}</td><td>{vavg}</td><td>{vmax}</td><td>{vmin}</td><td>{vmode}</td><td>{vmedian}</td><td></td></tr>
  </tbody>
</table>
`;

/** Nothing numeric to aggregate, so most methods throw and the cell falls back. */
export const CALC_ERROR_TABLE = `
<table>
  <thead>
    <tr><th>A</th><th>B</th><th>C</th></tr>
  </thead>
  <tbody>
    <tr><td>foo</td><td>bar</td><td>{hmax}</td></tr>
    <tr><td>baz</td><td>qux</td><td></td></tr>
    <tr><td>{vsum}</td><td>{vavg}</td><td></td></tr>
  </tbody>
</table>
`;

/** A cell holding markup must not shift the columns the calculation reads. */
export const CALC_WITH_MARKUP_TABLE = `
<table>
  <thead>
    <tr><th>Item</th><th>Count</th></tr>
  </thead>
  <tbody>
    <tr><td><a href="/a">a</a></td><td>3</td></tr>
    <tr><td><strong>b</strong> and <em>c</em></td><td>4</td></tr>
    <tr><td>total</td><td>{vsum}</td></tr>
  </tbody>
</table>
`;

/** A column of nothing but numbers, so it is sorted and aggregated arithmetically. */
export const NUMERIC_TABLE = `
<table>
  <thead>
    <tr><th>Team</th><th>Count</th></tr>
  </thead>
  <tbody>
    <tr><td>alpha</td><td>10</td></tr>
    <tr><td>beta</td><td>2</td></tr>
    <tr><td>alpha</td><td>30</td></tr>
    <tr><td>beta</td><td>4</td></tr>
  </tbody>
</table>
`;

/** Wide enough to scroll sideways, so pinning a column has something to do. */
export const WIDE_TABLE = buildTable({ rows: 6, columns: 12, prefix: 'w' });

/** Long enough to cross the pagination threshold in EnhancedTable. */
export const LONG_TABLE = buildTable({ rows: 250, columns: 3, prefix: 'r' });

/**
 * Builds a table fragment.
 *
 * Row numbers run 11.. before 1.., so the source order is visibly different from any
 * sorted order — a test that sorts cannot pass by accident.
 */
function buildTable({ rows, columns, prefix }: { rows: number; columns: number; prefix: string }): string {
  const header = Array.from({ length: columns }, (_, index) => `<th>col${index + 1}</th>`).join('');
  const numbers = Array.from({ length: rows }, (_, index) => index + 1);
  const order = [...numbers.slice(10), ...numbers.slice(0, 10)];

  const body = order.map((n) => `<tr>${Array.from({ length: columns }, (_, column) => `<td>${prefix}${column + 1}-${n}</td>`).join('')}</tr>`).join('');

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}
