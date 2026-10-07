import type { PasteDetail } from './details.js'

/** Cards and connections were pasted onto a board, which now holds them. */
export class HelixPastedEvent extends CustomEvent<PasteDetail> {
  static readonly eventName = 'helix-pasted'

  constructor(detail: PasteDetail) {
    super(HelixPastedEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
