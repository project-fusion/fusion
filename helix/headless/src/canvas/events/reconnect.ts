import type { ReconnectDetail } from './details.js'

/** A connection's end moved, and the move is finished. */
export class HelixReconnectEvent extends CustomEvent<ReconnectDetail> {
  static readonly eventName = 'helix-reconnect'

  constructor(detail: ReconnectDetail) {
    super(HelixReconnectEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
