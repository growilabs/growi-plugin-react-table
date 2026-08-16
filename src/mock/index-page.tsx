/*
 * Mounts the mock tables for index.html.
 *
 * No `tableComponent` is passed, so `components.table` stays unset — the same shape as
 * GROWI's preview renderer. That exercises the plugin's own fallback table element.
 * growi.html covers the view renderer, where GROWI supplies TableWithEditButton.
 */
import { exposeBridgeProbes } from './bridge-probe';
import { renderWithPlugin } from './harness';
import {
  BASIC_TABLE,
  CALC_ERROR_TABLE,
  CALC_TABLE,
  CALC_WITH_MARKUP_TABLE,
  HEADERLESS_TABLE,
  LONG_TABLE,
  NUMERIC_TABLE,
  RICH_CELL_TABLE,
  TINY_TABLE,
  WIDE_TABLE,
} from './tables';

renderWithPlugin('mock-basic', BASIC_TABLE);
renderWithPlugin('mock-rich-cell', RICH_CELL_TABLE);
renderWithPlugin('mock-tiny', TINY_TABLE);
renderWithPlugin('mock-headerless', HEADERLESS_TABLE);
renderWithPlugin('mock-calc', CALC_TABLE);
renderWithPlugin('mock-calc-error', CALC_ERROR_TABLE);
renderWithPlugin('mock-calc-markup', CALC_WITH_MARKUP_TABLE);
renderWithPlugin('mock-wide', WIDE_TABLE);
renderWithPlugin('mock-long', LONG_TABLE);
renderWithPlugin('mock-numeric', NUMERIC_TABLE);

exposeBridgeProbes();
