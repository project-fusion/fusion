import type { SkipDetail } from './details.js'

/** Fired when the reader asks for the previous one. See `HelixNextEvent`. */
export class HelixPreviousEvent extends CustomEvent<SkipDetail> {
  static readonly eventName = 'helix-previous'

  constructor() {
    super(HelixPreviousEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: { to: 'previous' },
    })
  }
}
