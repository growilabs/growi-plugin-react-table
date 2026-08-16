import type { PluginTable } from '../table/tableTypes';

type Props = {
  table: PluginTable;
  /** Rows in the source table, before any filtering. */
  totalRows: number;
};

/**
 * "Showing 3 of 12 rows", but only while rows are actually hidden.
 *
 * When everything is visible the count says nothing the reader cannot see, so it stays
 * out of the article. When rows *are* hidden it is the only signal that the table is not
 * showing the whole story — which is why it is not optional in that state.
 */
export const TableInfo = ({ table, totalRows }: Props) => {
  const visibleRows = table.getFilteredRowModel().rows.length;

  if (visibleRows === totalRows) {
    return null;
  }

  return (
    <p className="grt-info" role="status">
      Showing {visibleRows} of {totalRows} rows
      <button
        type="button"
        className="grt-toolbar__link"
        onClick={() => {
          // Clears what is hiding rows, and nothing else: sorting and column layout are
          // separate choices the reader did not ask to undo.
          table.resetColumnFilters();
          table.setGlobalFilter('');
        }}
      >
        show all
      </button>
    </p>
  );
};
