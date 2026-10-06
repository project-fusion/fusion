import type { ReorderDetail } from './details.js'

/**
 * Data Table's columns are in a different order.
 *
 * The notification after `helix-reorder`, sent once the order has moved, with
 * every field in the new one. Not cancelable, and past tense for the reason
 * `helix-sorted` is.
 */
export class HelixReorderedEvent extends CustomEvent<ReorderDetail> {
  static readonly eventName = 'helix-reordered'

  constructor(detail: ReorderDetail) {
    super(HelixReorderedEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
