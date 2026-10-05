import type { MapPartChangeDetail } from './details.js'

/**
 * A marker, a position, a route or an area changed what it says: where it is,
 * its points, its progress, its name.
 *
 * **Said rather than reflected.** The connector and the frame follow the
 * parts, and heard them through their attributes until the parts reflected
 * nothing CSS selects on: a live position's coordinates are state, and a
 * route's points are a payload, neither of which belongs in the markup. It
 * bubbles to the frame, whose light-DOM children the parts are, and goes no
 * further, being the family's own bookkeeping rather than news for a page.
 */
export class HelixMapPartChangeEvent extends CustomEvent<MapPartChangeDetail> {
  static readonly eventName = 'helix-map-part-change'

  constructor(detail: MapPartChangeDetail) {
    super(HelixMapPartChangeEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: false,
      detail,
    })
  }
}
