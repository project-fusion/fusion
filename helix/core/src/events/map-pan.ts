import type { MapPanDetail, ViewportPanDetail } from './details.js'

/**
 * The reader asked the map to move, which is as far as this library goes.
 *
 * **Helix draws no map and moves nobody's.** A tile renderer is a library and
 * the frame around it is what this adds, so panning is a request the consumer
 * answers against whatever they slotted: MapLibre, Leaflet, Google, or their
 * own. The direction is in reading order rather than compass order, because the
 * control that sent it is a button a reader pressed and `start` on a
 * right-to-left page is east.
 *
 * Not cancelable. Nothing here moves on its own, and an event whose
 * `preventDefault` means nothing is an event that lies about what it offers.
 */
export class HelixMapPanEvent extends CustomEvent<ViewportPanDetail> {
  static readonly eventName = 'helix-map-pan'

  constructor(detail: MapPanDetail) {
    super(HelixMapPanEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
