import type { MapRotateDetail } from './details.js'

/**
 * The user asked the map to rotate, from a rotate button or key. Turn your map
 * in response. Not cancelable, because the frame moves nothing itself.
 */
export class HelixMapRotateEvent extends CustomEvent<MapRotateDetail> {
  static readonly eventName = 'helix-map-rotate'

  constructor(detail: MapRotateDetail) {
    super(HelixMapRotateEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
