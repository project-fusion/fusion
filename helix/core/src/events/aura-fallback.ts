import type { AuraFallbackDetail } from './details.js'

/**
 * An aura stopped drawing its shader and shows its gradient, and says why.
 *
 * Sent each time it falls back, from the aura, which then matches
 * `:state(fallback)` until it draws again. Not cancelable: there is nothing
 * left to refuse.
 */
export class HelixAuraFallbackEvent extends CustomEvent<AuraFallbackDetail> {
  static readonly eventName = 'helix-aura-fallback'

  constructor(detail: AuraFallbackDetail) {
    super(HelixAuraFallbackEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
