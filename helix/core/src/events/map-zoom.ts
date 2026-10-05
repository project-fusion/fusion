import type { MapZoomDetail, ViewportZoomDetail } from './details.js'

/**
 * The reader asked the map to zoom, and for the same reason it is a request.
 *
 * `by` is a direction rather than a level: a scale a consumer's map understands
 * is the consumer's to decide, and a frame that said "go to zoom 14" would be
 * asserting a numbering that Leaflet, MapLibre and a static tile server do not
 * agree on.
 */
export class HelixMapZoomEvent extends CustomEvent<ViewportZoomDetail> {
  static readonly eventName = 'helix-map-zoom'

  constructor(detail: MapZoomDetail) {
    super(HelixMapZoomEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
