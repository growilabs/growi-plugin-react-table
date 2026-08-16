/*
 * Render-performance page for the plugin.
 *
 * Query parameters:
 *   ?tables=10   how many tables to put on the page   (default 1)
 *   &rows=50     rows per table                       (default 50)
 *   &cols=3      columns per table                    (default 3)
 *
 * Measurements land on `window.__bench` and are read by tests/perf.
 *
 * Timings are reported, not asserted: they move with machine load. What the perf spec
 * pins down is the countable part — how many rows end up in the DOM — so a change in
 * rendering strategy shows up as a diff rather than as a flake.
 */
import { renderWithPlugin } from '../mock/harness';

export type BenchResult = {
  params: { tables: number; rows: number; cols: number };
  /** From the first render call to every table having its rows in the DOM. */
  renderMs: number;
  /** Rows counted across every table once rendering settled. */
  renderedRows: number;
  ready: boolean;
};

declare global {
  interface Window {
    __bench?: BenchResult;
  }
}

const query = new URLSearchParams(window.location.search);
const intParam = (name: string, fallback: number): number => {
  const parsed = Number.parseInt(query.get(name) ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TABLES = intParam('tables', 1);
const ROWS = intParam('rows', 50);
const COLS = intParam('cols', 3);

/*
 * Row numbers run 11.. before 1.. so the source order differs from any sorted order, and
 * cells mix letters with digits so the natural sort has real work to do.
 */
const buildTable = (rows: number, columns: number): string => {
  const header = Array.from({ length: columns }, (_, index) => `<th>col${index + 1}</th>`).join('');
  const numbers = Array.from({ length: rows }, (_, index) => index + 1);
  const order = [...numbers.slice(10), ...numbers.slice(0, 10)];

  const body = order
    .map((n) => `<tr>${Array.from({ length: columns }, (_, column) => `<td>${String.fromCharCode(97 + (column % 26))}${n}</td>`).join('')}</tr>`)
    .join('');

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
};

const root = document.getElementById('bench-root') as HTMLElement;
const html = buildTable(ROWS, COLS);

const start = performance.now();

for (let index = 0; index < TABLES; index += 1) {
  const mount = document.createElement('div');
  mount.id = `bench-table-${index}`;
  root.append(mount);
  renderWithPlugin(mount, html);
}

const expectedRows = TABLES * ROWS;

/*
 * React roots commit asynchronously, so "finished" means the rows are actually in the
 * DOM. Polling on animation frames keeps the measurement on the same clock as painting.
 */
const waitForRows = () => {
  const renderedRows = root.querySelectorAll('tbody tr').length;

  if (renderedRows < expectedRows) {
    requestAnimationFrame(waitForRows);
    return;
  }

  window.__bench = {
    params: { tables: TABLES, rows: ROWS, cols: COLS },
    renderMs: performance.now() - start,
    renderedRows,
    ready: true,
  };
};

requestAnimationFrame(waitForRows);
