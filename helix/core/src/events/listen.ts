import type { ListenDetail } from './details.js'

/**
 * A field settled on a phrase it heard and put it in its value.
 *
 * Sent after the field's own `input`, for a page that keeps what was said
 * apart from what was typed.
 */
export class HelixListenEvent extends CustomEvent<ListenDetail> {
  static readonly eventName = 'helix-listen'

  constructor(detail: ListenDetail) {
    super(HelixListenEvent.eventName, {
      bubbles: true,
      composed: true,
      detail,
    })
  }
}
