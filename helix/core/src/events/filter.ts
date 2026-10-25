import type { FilterDetail } from './details.js'

/**
 * A component is showing a narrower or a wider set.
 *
 * The notification after `helix-before-filter`, sent once the query has moved,
 * with the query now in force. Not cancelable: the decision was the request's.
 */
export class HelixFilterEvent extends CustomEvent<FilterDetail> {
  static readonly eventName = 'helix-filter'

  constructor(detail: FilterDetail) {
    super(HelixFilterEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
