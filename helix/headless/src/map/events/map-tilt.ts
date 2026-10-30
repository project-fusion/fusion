import type { MapTiltDetail } from './details.js'

/**
 * The user asked the map to tilt, from a tilt button or key. Tilt your map in
 * response. Not cancelable, because the frame moves nothing itself.
 */
export class HelixMapTiltEvent extends CustomEvent<MapTiltDetail> {
  static readonly eventName = 'helix-map-tilt'

  constructor(detail: MapTiltDetail) {
    super(HelixMapTiltEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
