import type { FilterDetail } from './details.js'

/**
 * A component is showing a narrower or a wider set.
 *
 * The notification after `helix-filter`, sent once the query has moved, with
 * the query now in force. Not cancelable, and past tense for the reason
 * `helix-sorted` is.
 */
export class HelixFilteredEvent extends CustomEvent<FilterDetail> {
  static readonly eventName = 'helix-filtered'

  constructor(detail: FilterDetail) {
    super(HelixFilteredEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
