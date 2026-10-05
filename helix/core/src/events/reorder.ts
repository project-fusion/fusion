import type { ChangeDetail } from './details.js'

/**
 * Fired when the reader asks for the columns in a different order.
 *
 * Cancelable, and refusing it leaves the columns where they were, so a consumer
 * who stores the order, in a URL or a preference, can take the decision the way
 * a server-side sort takes `helix-sort`. The detail is the whole order as
 * space-separated fields rather than one move, because the order is the fact a
 * consumer stores, and a move is only meaningful against an order they would
 * then have to keep in step.
 *
 * Not `helix-sort`: that reorders the rows, this reorders the columns, and a
 * consumer listening for one should not hear the other.
 */
export class HelixReorderEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-reorder'

  constructor(detail: ChangeDetail) {
    super(HelixReorderEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
