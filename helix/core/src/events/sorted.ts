import type { SortDetail } from './details.js'

/**
 * The rows are in a different order.
 *
 * The notification after `helix-sort`, sent once `sort` has moved, with the
 * order now in force. Not cancelable: the decision was the request's.
 *
 * **Past tense, because the plain verb is the request.** `helix-sort` was
 * cancelable before the library had a word for its notification, and
 * consumers bind it by that name, so the notification takes the one after it.
 */
export class HelixSortedEvent extends CustomEvent<SortDetail> {
  static readonly eventName = 'helix-sorted'

  constructor(detail: SortDetail) {
    super(HelixSortedEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
