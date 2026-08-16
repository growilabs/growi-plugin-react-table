import { columnId, type ParsedTable } from './parseTable';
import type { ColumnFacets } from './tableTypes';

/**
 * A column with at most this many distinct values reads as a category (a status, an
 * owner, a type) and gets a dropdown. Above it, picking from a list is slower than
 * typing and the list stops being a summary of the column.
 */
const MAX_FACET_VALUES = 12;

/** Long values make an unusable dropdown even when there are only a few of them. */
const MAX_FACET_VALUE_LENGTH = 40;

/**
 * Works out which columns should filter by choosing a value rather than typing one.
 *
 * Derived from the source rows, not from `column.getFacetedUniqueValues()`. Faceted
 * values recompute against the currently filtered rows, so a dropdown built from them
 * loses options — sometimes the selected one — as soon as another column is filtered.
 */
export const computeColumnFacets = (parsed: ParsedTable): ColumnFacets => {
  const facets: ColumnFacets = new Map();

  parsed.headers.forEach((_header, index) => {
    const values = new Set<string>();

    for (const row of parsed.rows) {
      const value = row.values[index] ?? '';
      if (value === '') {
        continue;
      }
      if (value.length > MAX_FACET_VALUE_LENGTH) {
        return;
      }
      values.add(value);
      if (values.size > MAX_FACET_VALUES) {
        return;
      }
    }

    /*
     * Every value distinct means the column is an identifier, not a category — a
     * dropdown of five names out of five rows helps nobody.
     */
    if (values.size === 0 || values.size === parsed.rows.length) {
      return;
    }

    facets.set(
      columnId(index),
      [...values].sort((a, b) => a.localeCompare(b)),
    );
  });

  return facets;
};
