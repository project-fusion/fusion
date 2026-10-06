import type { BandDetail } from './details.js'

/**
 * A reading moved into another band: a meter whose value crossed `low`,
 * `high` or `optimum` into `good`, `fair` or `poor`.
 *
 * Sent once for each crossing, not on every value, so a listener can say the
 * change aloud or recolor something else on the page. Not cancelable, since
 * the reading has already moved. Bubbles and is composed.
 */
export class HelixBandEvent extends CustomEvent<BandDetail> {
  static readonly eventName = 'helix-band'

  constructor(detail: BandDetail) {
    super(HelixBandEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
