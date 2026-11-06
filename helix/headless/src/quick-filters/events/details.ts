/*
 * What the Quick Filters events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

import type { DataTableView } from '../../data-table/view.js'

/** Detail carried by `helix-before-view-save` and `helix-view-save`. */
export interface ViewSaveDetail {
  /** The name the view is saved under. */
  label: string
  /** The table's whole view, as JSON. */
  value: string
  /** The table's whole view. */
  view: DataTableView
}
