import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { CALC_METHODS, isMethodType, type MethodType, type TableData } from './CalcMethod';

/** What a cell shows when its calculation could not be performed. */
export const CALC_ERROR = '!CalcErr!';

/**
 * All the text inside a node, concatenated.
 *
 * One value per cell, so the extracted grid lines up with the rendered table. Reading
 * text nodes individually — as growi-plugin-datatables does — shifts every column after a
 * cell that holds markup or is empty.
 */
const textOf = (node: Element): string => {
  let text = '';
  visit(node, 'text', (child) => {
    text += child.value;
  });
  return text;
};

const childElements = (node: Element, tagName: string): Element[] =>
  node.children.filter((child): child is Element => child.type === 'element' && child.tagName === tagName);

/** The body rows as text. Only `<tbody>` counts, so header labels never enter a sum. */
const readBody = (table: Element): { rows: Element[][]; data: TableData } => {
  const rows: Element[][] = [];
  const data: TableData = [];

  for (const tbody of childElements(table, 'tbody')) {
    for (const tr of childElements(tbody, 'tr')) {
      const cells = [...childElements(tr, 'td'), ...childElements(tr, 'th')];
      rows.push(cells);
      data.push(cells.map(textOf));
    }
  }

  return { rows, data };
};

type Target = { row: number; column: number; methodType: MethodType };

const findTargets = (data: TableData): Target[] => {
  const targets: Target[] = [];

  data.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const trimmed = value.trim();
      if (isMethodType(trimmed)) {
        targets.push({ row: rowIndex, column: columnIndex, methodType: trimmed });
      }
    });
  });

  return targets;
};

const evaluate = (data: TableData, target: Target): string => {
  try {
    const result = CALC_METHODS[target.methodType](data, { row: target.row, column: target.column });
    return result?.toString() ?? CALC_ERROR;
  } catch {
    /*
     * mathjs throws when there is nothing to aggregate — a `{vavg}` under a column with
     * no numbers in it, for instance.
     *
     * This has to be caught here. GROWI renders a whole page body through a single
     * ReactMarkdown, so an exception escaping a rehype plugin does not blank the table:
     * it blanks the article.
     */
    return CALC_ERROR;
  }
};

/**
 * rehype plugin that evaluates the `{vsum}` family of cells.
 *
 * Values are computed once, from the source table, before React ever sees it — the same
 * behaviour as growi-plugin-datatables. Filtering the rendered table therefore does not
 * change a total, which is deliberate: the number belongs to the table the author wrote,
 * not to whatever subset a reader happens to be looking at.
 */
export const calcTable: Plugin<[], Root> = () => (tree) => {
  visit(tree, { type: 'element', tagName: 'table' }, (table: Element) => {
    const { rows, data } = readBody(table);

    const targets = findTargets(data);
    if (targets.length === 0) {
      return;
    }

    for (const target of targets) {
      const cell = rows[target.row]?.[target.column];
      if (cell == null) {
        continue;
      }
      // The cell held nothing but the notation, so replacing its contents loses nothing.
      cell.children = [{ type: 'text', value: evaluate(data, target) }];
    }
  });
};
