import type { ViewportZoomDetail } from '@fusion.dev/helix-core'

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
