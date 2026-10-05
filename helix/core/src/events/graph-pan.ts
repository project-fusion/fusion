import type { ViewportPanDetail } from './details.js'

/**
 * The reader asked the graph to move. A request, as a map's is: Helix draws no
 * graph, and the renderer the page slotted, or `connectGraph`, answers it.
 */
export class HelixGraphPanEvent extends CustomEvent<ViewportPanDetail> {
  static readonly eventName = 'helix-graph-pan'

  constructor(detail: ViewportPanDetail) {
    super(HelixGraphPanEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
