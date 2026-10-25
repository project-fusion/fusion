import type { ReorderDetail } from './details.js'

/**
 * A row or an item is about to move to a new place, and the move can be
 * refused.
 *
 * Sent once, when a drag lets go or a key drops the item, with the whole order
 * the move would leave. Call `preventDefault()` to keep the item where it is: a
 * pinned row, or a place the item may not go. Nothing has moved yet, and
 * `helix-reorder` follows where nobody refused.
 *
 * @followedBy helix-reorder
 */
export class HelixBeforeReorderEvent extends CustomEvent<ReorderDetail> {
  static readonly eventName = 'helix-before-reorder'

  constructor(detail: ReorderDetail) {
    super(HelixBeforeReorderEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
