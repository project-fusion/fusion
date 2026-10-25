import type { SortDetail } from './details.js'

/**
 * The rows are in a different order.
 *
 * The notification after `helix-before-sort`, sent once `sort` has moved, with
 * the order now in force. Not cancelable: the decision was the request's.
 */
export class HelixSortEvent extends CustomEvent<SortDetail> {
  static readonly eventName = 'helix-sort'

  constructor(detail: SortDetail) {
    super(HelixSortEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
