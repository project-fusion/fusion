import type { ReconnectDetail } from './details.js'

/**
 * A connection's end is about to move to another card or another side, and can
 * be refused.
 *
 * **A move, not a request, and that is the difference from `helix-connect`.**
 * The connection is already an element on the page, so the board rewrites its
 * ends itself, the way it writes a card's position onto the card; a page that
 * holds its connections in state refuses this and writes them there.
 */
export class HelixBeforeReconnectEvent extends CustomEvent<ReconnectDetail> {
  static readonly eventName = 'helix-before-reconnect'

  constructor(detail: ReconnectDetail) {
    super(HelixBeforeReconnectEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
