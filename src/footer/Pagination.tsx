import type { PluginTable } from '../table/tableTypes';

type Props = {
  table: PluginTable;
};

/**
 * Pager for tables long enough to have been split.
 *
 * Short tables are never paginated (see PAGINATION_THRESHOLD in EnhancedTable), so this
 * renders nothing for almost every table in a wiki. A markdown table the author expected
 * to be read top to bottom should be readable top to bottom.
 */
export const Pagination = ({ table }: Props) => {
  const pageCount = table.getPageCount();
  if (pageCount <= 1) {
    return null;
  }

  const pageIndex = table.state.pagination?.pageIndex ?? 0;

  return (
    <nav className="grt-pagination" aria-label="Table pages">
      <button type="button" className="grt-toolbar__button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
        Previous
      </button>
      <span className="grt-pagination__status">
        Page {pageIndex + 1} of {pageCount}
      </span>
      <button type="button" className="grt-toolbar__button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
        Next
      </button>
    </nav>
  );
};
