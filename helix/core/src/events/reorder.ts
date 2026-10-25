import type { ReorderDetail } from './details.js'

/**
 * A row, an item, or a column moved to a new place.
 *
 * The notification after `helix-before-reorder`, with every key in the new
 * order. Not cancelable: the decision was the request's.
 *
 * **For rows and items, you move them.** Helix moves no element it does not own,
 * so a list or a data table sends this once the move stands, and you move your
 * data to the order in `keys`.
 *
 * **For Data Table's columns, the table has moved them** by the time this
 * arrives, and `value` is the whole order as fields separated by spaces, which
 * is what `order` holds.
 *
 * `kind` says which of the three moved, since a data table sends this for its
 * rows and for its columns. `helix-sort` reports rows ordered by a column, and
 * this reports one row or column moved by hand.
 */
export class HelixReorderEvent extends CustomEvent<ReorderDetail> {
  static readonly eventName = 'helix-reorder'

  constructor(detail: ReorderDetail) {
    super(HelixReorderEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
