import type { GraphLayoutDetail } from './details.js'

/**
 * A layout settled, with where it put every note. Keep the positions and hand
 * them back as each note's `x` and `y`, and the graph opens where the reader
 * left it, with no layout to run.
 */
export class HelixGraphLayoutEvent extends CustomEvent<GraphLayoutDetail> {
  static readonly eventName = 'helix-graph-layout'

  constructor(detail: GraphLayoutDetail) {
    super(HelixGraphLayoutEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
