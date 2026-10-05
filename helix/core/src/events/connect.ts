import type { ConnectDetail } from './details.js'

/**
 * A reader asked for two cards to be joined.
 *
 * **A request with no default, which is the difference from a move.** A board
 * writes a card's position onto the card, because the card is already there.
 * A connection is a new element, and a board that added one to markup React
 * renders would have it put back or thrown away on the next render. So the board
 * asks and the page adds the `helix-canvas-edge`, the way `Map` asks to be panned.
 */
export class HelixConnectEvent extends CustomEvent<ConnectDetail> {
  static readonly eventName = 'helix-connect'

  constructor(detail: ConnectDetail) {
    super(HelixConnectEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
