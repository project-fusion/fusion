import type { ReadDetail } from './details.js'

/**
 * Something a user comes back to was marked read, or unread.
 *
 * The notification after `helix-before-read`, sent once `read` holds the change,
 * with the state now in force. Bubbles and is composed, so a feed hears its own
 * items. Not cancelable: the decision was the request's.
 */
export class HelixReadEvent extends CustomEvent<ReadDetail> {
  static readonly eventName = 'helix-read'

  constructor(detail: ReadDetail) {
    super(HelixReadEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
