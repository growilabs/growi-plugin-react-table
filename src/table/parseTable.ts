import { isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Tables smaller than this are left as plain tables.
 *
 * A one-row table has nothing to sort and nothing to filter, so a toolbar above it is
 * pure noise in the middle of an article. Two rows is the point where ordering starts to
 * mean something.
 */
export const MIN_BODY_ROWS = 2;

export type ParsedHeader = {
  /** Column id used throughout the table instance. Positional, so it survives reordering. */
  id: string;
  /** Plain text of the header cell, used as the accessible label in menus. */
  label: string;
  /** The original `<th>`, reused so its alignment styles and markup are preserved. */
  element: ReactElement;
  /**
   * Every non-empty cell in this column parses as a number.
   *
   * Such a column is fed to TanStack as numbers, which gives it a true numeric sort and
   * lets grouping produce a real total. Mixed columns like "2.4m" stay text and get the
   * natural (alphanumeric) sort instead.
   */
  isNumeric: boolean;
};

export type ParsedRow = {
  /** The original `<td>` elements, in source order. */
  cells: ReactElement[];
  /** Plain text per cell. This is what the table sorts and filters on. */
  values: string[];
};

export type ParsedTable = {
  headers: ParsedHeader[];
  rows: ParsedRow[];
  /** Props of the original `<thead>` / `<tbody>`, so the rebuilt sections keep them. */
  theadProps: Record<string, unknown>;
  tbodyProps: Record<string, unknown>;
};

/** Column ids are positional, so they stay stable when columns are reordered or hidden. */
export const columnId = (index: number): string => `c${index}`;

export const columnIndexOf = (id: string): number => Number(id.slice(1));

/** Flattens the ReactNode shapes rehype-react produces into a plain list. */
const flatten = (node: ReactNode): ReactNode[] => {
  if (Array.isArray(node)) {
    return node.flatMap(flatten);
  }
  return [node];
};

const elementsNamed = (node: ReactNode, ...tagNames: string[]): ReactElement[] =>
  flatten(node).filter((child): child is ReactElement => isValidElement(child) && typeof child.type === 'string' && tagNames.includes(child.type));

const childrenOf = (element: ReactElement): ReactNode => (element.props as { children?: ReactNode }).children;

/**
 * The text a cell contributes to sorting and filtering.
 *
 * Recurses through elements rather than reading `textContent`, because at this point the
 * cell is a React element tree that has not been rendered yet. Nested components (GROWI
 * maps `img` to its own LightBox, for instance) still expose their children here.
 */
export const textOf = (node: ReactNode): string => {
  if (node == null || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }
  if (isValidElement(node)) {
    return textOf(childrenOf(node));
  }
  return '';
};

/**
 * Reads the `<thead>` / `<tbody>` that GROWI's renderer produced for a markdown table.
 *
 * Returns null when the table should be left alone: no header row, no body rows, ragged
 * or empty rows, or fewer than MIN_BODY_ROWS rows. Callers render the original children
 * unchanged in that case.
 *
 * The original `<th>` / `<td>` elements are carried through rather than converted to
 * strings. Reusing them is what keeps links, code spans and GROWI's own cell components
 * intact once rows are reordered or columns hidden.
 */
export const parseTable = (children: ReactNode): ParsedTable | null => {
  const thead = elementsNamed(children, 'thead')[0];
  const tbody = elementsNamed(children, 'tbody')[0];
  if (thead == null || tbody == null) {
    return null;
  }

  const headerRow = elementsNamed(childrenOf(thead), 'tr')[0];
  if (headerRow == null) {
    return null;
  }

  const headerCells = elementsNamed(childrenOf(headerRow), 'th', 'td');
  if (headerCells.length === 0) {
    return null;
  }

  const bodyRows = elementsNamed(childrenOf(tbody), 'tr');
  if (bodyRows.length < MIN_BODY_ROWS) {
    return null;
  }

  const rows: ParsedRow[] = [];
  for (const row of bodyRows) {
    const cells = elementsNamed(childrenOf(row), 'td', 'th');

    /*
     * A row that does not line up with the header cannot be mapped onto columns.
     * GFM never produces one, but hand-written HTML in a markdown page can, and a
     * partially mapped table is worse than an untouched one.
     */
    if (cells.length !== headerCells.length) {
      return null;
    }

    rows.push({
      cells,
      values: cells.map((cell) => textOf(childrenOf(cell)).trim()),
    });
  }

  const headers: ParsedHeader[] = headerCells.map((element, index) => ({
    id: columnId(index),
    label: textOf(childrenOf(element)).trim(),
    element,
    isNumeric: isNumericColumn(rows, index),
  }));

  return {
    headers,
    rows,
    theadProps: sectionProps(thead),
    tbodyProps: sectionProps(tbody),
  };
};

const isNumericColumn = (rows: ParsedRow[], index: number): boolean => {
  let seen = false;

  for (const row of rows) {
    const value = row.values[index] ?? '';
    if (value === '') {
      continue;
    }
    if (!Number.isFinite(Number(value))) {
      return false;
    }
    seen = true;
  }

  return seen;
};

const sectionProps = (element: ReactElement): Record<string, unknown> => {
  const { children: _children, ...rest } = element.props as { children?: ReactNode };
  return rest;
};
