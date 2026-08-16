import type { ReactTable } from '@tanstack/react-table';
import type { Features } from './features';

/**
 * One table row as TanStack Table sees it.
 *
 * Text, except for columns whose every cell parses as a number — those are stored as
 * numbers so sorting and aggregation behave arithmetically. The rendered cells are
 * GROWI's own React elements and are looked up separately by `__index`, the row's
 * position in the source table.
 */
export type RowRecord = Record<string, string | number> & { __index: number };

export type PluginTable = ReactTable<Features, RowRecord>;

export type PluginColumn = ReturnType<PluginTable['getVisibleLeafColumns']>[number];

/**
 * Distinct values per column, for the columns that read as categorical.
 *
 * Computed once from the source table rather than from TanStack's faceted values, so the
 * choices on offer do not shift around as other filters narrow the rows — including the
 * option that is currently selected.
 */
export type ColumnFacets = Map<string, string[]>;
