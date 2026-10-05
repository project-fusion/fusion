import type { RelabelDetail } from './details.js'

/**
 * A label the board draws is about to change, and can be refused.
 *
 * **The board edits what it draws and asks for what it does not.** A
 * connection's label and a group's name are drawn by the board from an
 * attribute, so the board edits them in place and writes the attribute back,
 * the way it writes a card's position; a page holding them in state refuses
 * this and writes them there. A card's own content is the page's, which is why
 * that is `helix-canvas-edit`, a request, rather than this.
 */
export class HelixBeforeRelabelEvent extends CustomEvent<RelabelDetail> {
  static readonly eventName = 'helix-before-relabel'

  constructor(detail: RelabelDetail) {
    super(HelixBeforeRelabelEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
