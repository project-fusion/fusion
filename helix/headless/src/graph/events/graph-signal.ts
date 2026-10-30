import type { GraphSignalDetail } from './details.js'

/**
 * Something passed between two notes, which the renderer draws traveling
 * from one to the other. The connector hears it and the renderer draws it; it
 * stays on the frame, being the family's own bookkeeping rather than news for
 * a page.
 */
export class HelixGraphSignalEvent extends CustomEvent<GraphSignalDetail> {
  static readonly eventName = 'helix-graph-signal'

  constructor(detail: GraphSignalDetail) {
    super(HelixGraphSignalEvent.eventName, {
      bubbles: false,
      cancelable: false,
      composed: false,
      detail,
    })
  }
}
