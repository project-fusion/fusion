import type { ViewportZoomDetail } from './details.js'

/** The board zoomed, and told, for the same reason. */
export class HelixCanvasZoomEvent extends CustomEvent<ViewportZoomDetail> {
  static readonly eventName = 'helix-canvas-zoom'

  constructor(detail: ViewportZoomDetail) {
    super(HelixCanvasZoomEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
