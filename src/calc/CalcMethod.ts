import { max, mean, median, min, mode, sum } from 'mathjs/number';

/*
 * The calculation notation from growi-plugin-datatables, kept compatible.
 *
 * `mathjs/number` rather than `mathjs`: the same six functions imported from the main
 * entry point bundle at 56.8 KB gzipped, and mathjs' own factory pattern
 * (`create({ sumDependencies, ... })`) is worse still at 21.7 KB because `create` drags in
 * the typed-function machinery. The number-only entry point tree-shakes to 18.5 KB and is
 * behaviourally identical — including the details this plugin depends on:
 *
 *   - sum([]) is 0, while the others throw on an empty set (that throw is what produces
 *     the "!CalcErr!" cell, see CalcTable.ts)
 *   - mode() returns *every* most-frequent value as an array, so a column where each
 *     value appears once renders as a comma-separated list
 *
 * simple-statistics would be 1.6 KB, but its mode() returns a single value, which would
 * change that last behaviour and with it the compatibility grid in tests/calc.
 */

const MethodType = {
  vsum: '{vsum}',
  hsum: '{hsum}',
  vavg: '{vavg}',
  havg: '{havg}',
  vmax: '{vmax}',
  hmax: '{hmax}',
  vmin: '{vmin}',
  hmin: '{hmin}',
  vmode: '{vmode}',
  hmode: '{hmode}',
  vmedian: '{vmedian}',
  hmedian: '{hmedian}',
} as const;

export type MethodType = (typeof MethodType)[keyof typeof MethodType];

export const METHOD_TYPES: readonly MethodType[] = Object.values(MethodType);

export const isMethodType = (value: string): value is MethodType => (METHOD_TYPES as readonly string[]).includes(value);

/** The table body as text, one entry per cell. */
export type TableData = string[][];

export type CellPosition = { row: number; column: number };

/** `v*` methods read down a column, `h*` methods read across a row. */
type Direction = 'row' | 'column';

/** mathjs' mode() returns an array; the rest return a number. */
type CalcResult = number | number[];

type Calculator = (values: number[]) => CalcResult;

type CalcMethod = (data: TableData, position: CellPosition) => CalcResult;

const toNumber = (value: string | undefined): number | undefined => {
  if (value == null || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** Cells that are not numbers simply do not take part — including the method cell itself. */
const numericValues = (values: (string | undefined)[]): number[] => values.map(toNumber).filter((value): value is number => value != null);

const cellsFor = (data: TableData, direction: Direction, position: CellPosition): (string | undefined)[] =>
  direction === 'row' ? (data[position.row] ?? []) : data.map((row) => row[position.column]);

const method =
  (direction: Direction, calculate: Calculator): CalcMethod =>
  (data, position) =>
    calculate(numericValues(cellsFor(data, direction, position)));

export const CALC_METHODS: Record<MethodType, CalcMethod> = {
  [MethodType.vsum]: method('column', sum),
  [MethodType.hsum]: method('row', sum),
  [MethodType.vavg]: method('column', mean),
  [MethodType.havg]: method('row', mean),
  [MethodType.vmax]: method('column', max),
  [MethodType.hmax]: method('row', max),
  [MethodType.vmin]: method('column', min),
  [MethodType.hmin]: method('row', min),
  [MethodType.vmode]: method('column', mode),
  [MethodType.hmode]: method('row', mode),
  [MethodType.vmedian]: method('column', median),
  [MethodType.hmedian]: method('row', median),
};
