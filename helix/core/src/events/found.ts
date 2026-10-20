import type { FoundDetail } from './details.js'

/**
 * A search found its matches, or moved among them, with how many there are
 * and which is current.
 *
 * Sent by Find after each search and each move, and again when content that
 * changed under an open search is searched again. Not cancelable: it reports
 * matches already marked, as `helix-filtered` reports a list already
 * narrowed.
 */
export class HelixFoundEvent extends CustomEvent<FoundDetail> {
  static readonly eventName = 'helix-found'

  constructor(detail: FoundDetail) {
    super(HelixFoundEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
