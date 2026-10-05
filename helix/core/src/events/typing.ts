import type { TypingDetail } from './details.js'

/**
 * The user started or stopped writing: a chat composer, for a typing
 * indicator on the other side. Carries which, as the composer's `typing` does.
 * Not cancelable: it reports what the user did.
 */
export class HelixTypingEvent extends CustomEvent<TypingDetail> {
  static readonly eventName = 'helix-typing'

  constructor(detail: TypingDetail) {
    super(HelixTypingEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
