import type { PasteDetail } from './details.js'

/**
 * Cards are about to be pasted onto a board, and can be refused.
 *
 * The board adds the cards and connections in the detail by default, as
 * `helix-canvas-node` and `helix-canvas-edge` elements. A page that renders
 * its cards from its own state calls `preventDefault()` here and adds the
 * detail's document to that state, through `fromJsonCanvas`.
 *
 * @followedBy helix-pasted
 */
export class HelixBeforePasteEvent extends CustomEvent<PasteDetail> {
  static readonly eventName = 'helix-before-paste'

  constructor(detail: PasteDetail) {
    super(HelixBeforePasteEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
