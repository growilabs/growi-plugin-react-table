/*
 * Mounts the mock tables for growi.html.
 *
 * Unlike index.html, this passes GROWI's own `components.table` — the component the
 * plugin actually wraps in production. growi-plugin-datatables documents why the
 * distinction matters: bugs caused by the plugin's own controls colliding with GROWI's
 * "edit this table" button are 原理的に検出できない against a plain `<table>`.
 */
import { renderWithPlugin } from './harness';
import { MockTableWithEditButton } from './MockTableWithEditButton';
import { BASIC_TABLE, WIDE_TABLE } from './tables';

const setup = { tableComponent: MockTableWithEditButton };

renderWithPlugin('mock-growi-basic', BASIC_TABLE, setup);
renderWithPlugin('mock-growi-wide', WIDE_TABLE, setup);
