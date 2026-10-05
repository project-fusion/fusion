import type { ViewportPanDetail } from './details.js'

/**
 * The board moved, which on a canvas is a fact rather than a request.
 *
 * **`Map` asks and `Canvas` tells, and the difference is who draws.** A map is
 * somebody else's, so the frame can only ask them to move it; a canvas is drawn
 * here from a document, so the same press moves it and this says that it did.
 * The detail is the same shape either way, being a direction and a distance.
 */
export class HelixCanvasPanEvent extends CustomEvent<ViewportPanDetail> {
  static readonly eventName = 'helix-canvas-pan'

  constructor(detail: ViewportPanDetail) {
    super(HelixCanvasPanEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
