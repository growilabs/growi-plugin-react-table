import type { ColumnFacets, PluginTable } from '../table/tableTypes';

type Props = {
  table: PluginTable;
  facets: ColumnFacets;
  /** Header labels by column id, so each control can name the column it filters. */
  labels: Map<string, string>;
  /** Pads the row when the table shows a leading column of per-row controls. */
  leadingCell: boolean;
};

/**
 * An extra `<thead>` row holding one filter control per column.
 *
 * It sits inside the table rather than in the toolbar so every control is directly under
 * the column it filters. With ten columns, a detached list of ten inputs is unreadable.
 *
 * The control follows the data: a column of a few repeated values (a status, a category)
 * becomes a dropdown; anything else gets a substring box. See table/facets.ts.
 */
export const FiltersRow = ({ table, facets, labels, leadingCell }: Props) => (
  <tr className="grt-filters">
    {leadingCell && <th className="grt-filters__cell" />}
    {table.getVisibleLeafColumns().map((column) => {
      if (!column.getCanFilter()) {
        return <th key={column.id} className="grt-filters__cell" />;
      }

      const value = (column.getFilterValue() as string | undefined) ?? '';
      const options = facets.get(column.id);
      const label = `Filter by ${labels.get(column.id) ?? column.id}`;

      return (
        <th key={column.id} className="grt-filters__cell">
          {options == null ? (
            <input
              type="search"
              className="grt-filters__control"
              value={value}
              placeholder="Filter"
              aria-label={label}
              onChange={(event) => column.setFilterValue(event.target.value)}
            />
          ) : (
            <select className="grt-filters__control" value={value} aria-label={label} onChange={(event) => column.setFilterValue(event.target.value)}>
              <option value="">All</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </th>
      );
    })}
  </tr>
);
