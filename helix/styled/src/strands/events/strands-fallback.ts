import type { StrandsFallbackDetail } from './details.js'

/**
 * A strands element stopped drawing its ribbon and shows its gradient, and
 * says why.
 *
 * Sent each time it falls back, from the element, which then matches
 * `:state(fallback)` until it draws again. Not cancelable: there is nothing
 * left to refuse.
 */
export class HelixStrandsFallbackEvent extends CustomEvent<StrandsFallbackDetail> {
  static readonly eventName = 'helix-strands-fallback'

  constructor(detail: StrandsFallbackDetail) {
    super(HelixStrandsFallbackEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
