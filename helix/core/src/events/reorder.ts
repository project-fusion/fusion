import type { ReorderDetail } from './details.js'

/**
 * Fired when you ask for a row, an item, or a column to move to a new place.
 *
 * **For rows and items, you move them.** Helix moves no element it does not
 * own, so a list or a data table sends this after `helix-before-reorder`, and
 * you move your data to the order in `keys`. Calling `preventDefault()` says
 * the move did not happen, and the element tells a screen reader it was
 * canceled.
 *
 * **For Data Table's columns, the table moves them.** Calling
 * `preventDefault()` leaves the columns where they were, so you can store the
 * order in a URL or a preference and decide it yourself, the way a server-side
 * sort takes `helix-sort`. `value` is the whole order as fields separated by
 * spaces, which is what `order` takes.
 *
 * `kind` says which of the three moved, since a data table sends this for its
 * rows and for its columns. `helix-sort` orders rows by a column, and this
 * moves one row or column by hand.
 */
export class HelixReorderEvent extends CustomEvent<ReorderDetail> {
  static readonly eventName = 'helix-reorder'

  constructor(detail: ReorderDetail) {
    super(HelixReorderEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
