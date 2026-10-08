/*
 * The guard both tables put a column's `text-align` through, in a module that
 * registers nothing.
 *
 * Data Table reads the columns a page writes and never draws one: a column is
 * an element of this family, which the page imports through
 * `@fusion.dev/helix-headless/table`. Data Table imports this rather than
 * `table-column.ts`, whose import would register the column for it.
 */

/** The edges a column's `text-align` may name. */
const EDGES = new Set(['center', 'end', 'start'])

/**
 * The edge a column names, where it names one of the three.
 *
 * **`text-align` is a string anybody can write**, the union on the property being a
 * compile-time claim and nothing else, and both tables put the value straight
 * into CSS: `Table` into a rule in each row's shadow root, `DataTable` into the
 * cell it draws. One guard, here with the property, rather than one in each
 * table and only one of them written.
 */
export const edgeOf = (align: string | undefined): string | undefined =>
  align && EDGES.has(align) ? align : undefined
