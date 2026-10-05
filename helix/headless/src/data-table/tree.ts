/**
 * Rows that hold rows, arranged for a tree grid: filtered, sorted within each
 * parent, and laid out flat in reading order with the open rows' children under
 * them.
 *
 * Pure and beside the family's `index.ts`, because which rows show and at what
 * depth is a fact about the data, and a spec can hold it without a page.
 *
 * **Filtered by descent.** A row stays when it matches the query or any row
 * under it does, so a match deep in the tree is shown with the rows that lead to
 * it, and while a query is on every row with a match under it is open.
 *
 * **Sorted among siblings.** A sort orders each parent's rows and leaves every
 * row under its parent, which is the only order a tree can be read in.
 */
import { at } from '../table/column/table-column.js'
import { type Axis, type DataRow, filter, parse, sort } from './root/order.js'

/** Where a row sits in the tree. */
export interface Placement {
  /** Whether it has children to show. */
  branch: boolean
  /** How deep the row is, from 1 for a row with no parent. */
  level: number
  /** Whether its children are shown. */
  open: boolean
  /** The row it sits under, if any. */
  parent: DataRow | undefined
  /** Its place among its siblings, from 1. */
  position: number
  /** How many siblings it has, itself included. */
  siblings: number
}

/** The rows a tree shows, and the counts around them. */
export interface Grown {
  /** Every row in the tree, shown or not, for a selection of every row. */
  every: DataRow[]
  /** Where each shown row sits. */
  placed: Map<DataRow, Placement>
  /** The rows shown, in reading order. */
  rows: DataRow[]
  /** How many rows the tree holds before filtering. */
  total: number
}

/** The rows under `row`, read from `field`: an array, or none. */
export const childrenOf = (row: DataRow, field: string): DataRow[] => {
  const value = at(row, field)
  return Array.isArray(value) ? (value as DataRow[]) : []
}

/**
 * The tree laid out flat: each shown row followed by its children where it is
 * open, which `isOpen` says. While `query` is set, a row with a match under it
 * is open whatever `isOpen` says.
 */
export const grow = (
  rows: readonly DataRow[],
  axes: readonly Axis[],
  {
    field,
    isOpen,
    query,
    spec,
  }: { field: string; isOpen: (row: DataRow) => boolean; query: string; spec: string },
): Grown => {
  const searching = query.trim() !== ''
  const order = parse(spec)
  const every: DataRow[] = []
  const kept = new Set<DataRow>()
  /* Depth first, so a row knows whether anything under it stays before it is
     asked whether it stays itself. Each row is visited once, a row held twice
     in the data included. */
  const seen = new Set<DataRow>()
  const keep = (row: DataRow): boolean => {
    if (seen.has(row)) {
      return kept.has(row)
    }
    seen.add(row)
    every.push(row)
    let below = false
    for (const child of childrenOf(row, field)) {
      below = keep(child) || below
    }
    const stays = below || !searching || filter([row], query, axes).length > 0
    if (stays) {
      kept.add(row)
    }
    return stays
  }
  for (const row of rows) {
    keep(row)
  }
  const placed = new Map<DataRow, Placement>()
  const shown: DataRow[] = []
  const lay = (level: readonly DataRow[], depth: number, parent: DataRow | undefined): void => {
    const siblings = sort(
      level.filter((row) => kept.has(row) && !placed.has(row)),
      order,
      axes,
    )
    for (const [index, row] of siblings.entries()) {
      const children = childrenOf(row, field).filter((child) => kept.has(child))
      const open = children.length > 0 && (searching || isOpen(row))
      placed.set(row, {
        branch: children.length > 0,
        level: depth,
        open,
        parent,
        position: index + 1,
        siblings: siblings.length,
      })
      shown.push(row)
      if (open) {
        lay(children, depth + 1, row)
      }
    }
  }
  lay(rows, 1, undefined)
  return { every, placed, rows: shown, total: every.length }
}
