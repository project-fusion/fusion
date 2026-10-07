import type { ReadingDetail } from './details.js'

/**
 * A chart moved to a reading, or put its reading away: a pointer crossed into
 * one, a tap or a key landed on one, or the pointer left. Chart.js's
 * `onHover`.
 *
 * Sent once for each change, never for a pointer moving within the reading it
 * is already on. `index` is `-1` once no reading is shown. Not cancelable,
 * since the chart has already moved. Bubbles and is composed.
 */
export class HelixReadingChangeEvent extends CustomEvent<ReadingDetail> {
  static readonly eventName = 'helix-reading-change'

  constructor(detail: ReadingDetail) {
    super(HelixReadingChangeEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
