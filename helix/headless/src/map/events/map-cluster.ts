import type { MapClusterDetail } from './details.js'

/**
 * A reader pressed a cluster: one marker standing for several that would have
 * drawn over each other, or a points layer's count.
 *
 * **Opened by zooming in**, which the connector does, framing the places the
 * cluster holds, as pressing one does on every map a reader has used. Told
 * rather than asked: a page that lists a cluster of markers in a panel
 * instead connects with `clusterZoom: false`. Sent from the marker the
 * cluster is drawn as, or from the points layer, and bubbles through the
 * frame to the page.
 */
export class HelixMapClusterEvent extends CustomEvent<MapClusterDetail> {
  static readonly eventName = 'helix-map-cluster'

  constructor(detail: MapClusterDetail) {
    super(HelixMapClusterEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: false,
      detail,
    })
  }
}
