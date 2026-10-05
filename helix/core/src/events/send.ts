import type { SendDetail } from './details.js'

/**
 * Fired when the reader offers something they wrote.
 *
 * **Cancelable, and the composer clears only when nobody refused.** Sending is a
 * round trip: a composer that empties itself and then hears the request failed
 * has thrown away the only copy of what the reader typed, and a reader who has
 * just written three paragraphs is exactly who cannot afford that. Refusing
 * leaves the text where it is.
 *
 * Not `helix-create`, which is the combobox's event for a value a list does not
 * hold, and not `helix-change`, because nothing about a value changed: the
 * reader finished something and handed it over.
 */
export class HelixSendEvent extends CustomEvent<SendDetail> {
  static readonly eventName = 'helix-send'

  constructor(detail: SendDetail) {
    super(HelixSendEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
