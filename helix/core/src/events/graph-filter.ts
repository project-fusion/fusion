import type { GraphFilterDetail } from './details.js'

/**
 * A reader pressed a group in the graph's legend, which would show or hide
 * its notes, sent from the frame before it does. Cancelable: cancel it to
 * keep the groups as they were, or to set `hiddenGroups` yourself.
 */
export class HelixGraphFilterEvent extends CustomEvent<GraphFilterDetail> {
  static readonly eventName = 'helix-graph-filter'

  constructor(detail: GraphFilterDetail) {
    super(HelixGraphFilterEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
