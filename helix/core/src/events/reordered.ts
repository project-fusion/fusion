import type { ChangeDetail } from './details.js'

/**
 * The columns are in a different order.
 *
 * The notification after `helix-reorder`, sent once the order has moved, with
 * every field in the new one. Not cancelable, and past tense for the reason
 * `helix-sorted` is.
 */
export class HelixReorderedEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-reordered'

  constructor(detail: ChangeDetail) {
    super(HelixReorderedEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
