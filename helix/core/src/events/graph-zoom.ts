import type { ViewportZoomDetail } from './details.js'

/** The reader asked the graph to zoom, a direction and not a level, as a map's is. */
export class HelixGraphZoomEvent extends CustomEvent<ViewportZoomDetail> {
  static readonly eventName = 'helix-graph-zoom'

  constructor(detail: ViewportZoomDetail) {
    super(HelixGraphZoomEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
