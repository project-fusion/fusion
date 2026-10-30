import type { GraphPartChangeDetail } from './details.js'

/**
 * The frame's notes, links, selection, depth or gestures changed, which the
 * connector hears and the renderer is told. It stays on the frame, being the
 * family's own bookkeeping rather than news for a page.
 */
export class HelixGraphPartChangeEvent extends CustomEvent<GraphPartChangeDetail> {
  static readonly eventName = 'helix-graph-part-change'

  constructor(detail: GraphPartChangeDetail) {
    super(HelixGraphPartChangeEvent.eventName, {
      bubbles: false,
      cancelable: false,
      composed: false,
      detail,
    })
  }
}
