import type { RelabelDetail } from './details.js'

/** A label the board draws changed. */
export class HelixRelabelEvent extends CustomEvent<RelabelDetail> {
  static readonly eventName = 'helix-relabel'

  constructor(detail: RelabelDetail) {
    super(HelixRelabelEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
