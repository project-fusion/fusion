import type { GraphFilterDetail } from './details.js'

/**
 * The graph shows or hides a group's notes.
 *
 * The notification after `helix-before-graph-filter`, sent once `hiddenGroups`
 * holds the change, with every group now hidden. Not cancelable: the decision was
 * the request's.
 */
export class HelixGraphFilterEvent extends CustomEvent<GraphFilterDetail> {
  static readonly eventName = 'helix-graph-filter'

  constructor(detail: GraphFilterDetail) {
    super(HelixGraphFilterEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
