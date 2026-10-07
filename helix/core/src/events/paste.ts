import type { PasteDetail } from './details.js'

/** Cards and connections were pasted onto a board, which now holds them. */
export class HelixPasteEvent extends CustomEvent<PasteDetail> {
  static readonly eventName = 'helix-paste'

  constructor(detail: PasteDetail) {
    super(HelixPasteEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
