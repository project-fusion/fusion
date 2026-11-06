/*
 * What the Data Table events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

import type { DataTableView } from '../view.js'

/** Detail carried by `helix-before-column-toggle` and `helix-column-toggle`. */
export interface ColumnToggleDetail {
  /** The `field` of the column. */
  field: string
  /** Whether the column is hidden after the change. */
  hidden: boolean
}

/** Detail carried by `helix-before-follow` and `helix-follow`. */
export interface FollowDetail {
  /** The path, query, and hash the link names, ready for a router. */
  href: string
}

/** Detail carried by `helix-before-view-change` and `helix-view-change`. */
export interface ViewChangeDetail {
  /** The whole view after the change, as JSON. */
  value: string
  /** The whole view after the change. */
  view: DataTableView
}

/** Detail carried by `helix-before-export` and `helix-export`. */
export interface ExportDetail {
  /** Which columns go in: the `visible` ones or `all`. */
  columns: 'all' | 'visible'
  /** How many rows go in. */
  count: number
  /** The name the file is saved under, such as `invoices.csv`. */
  filename: string
  /** The kind of file. */
  format: 'csv' | 'json' | 'tsv' | 'xlsx'
  /** Which rows go in: the `selected` ones, the `filtered` ones, or `all`. */
  rows: 'all' | 'filtered' | 'selected'
  /** Whether the values are written as the cells show them or as the rows hold them. */
  values: 'raw' | 'shown'
  /** The table's whole view, which a server reads to make the same rows. */
  view: DataTableView
}
