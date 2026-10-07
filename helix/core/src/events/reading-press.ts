import type { ReadingDetail } from './details.js'

/**
 * A reading of a chart was pressed: clicked, tapped, or Enter or Space on the
 * plot while the keys rest on it. Chart.js's `onClick`.
 *
 * For a page that opens what a reading stands for, such as the month behind a
 * column. Not cancelable, since a chart does nothing of its own on a press.
 * Bubbles and is composed.
 */
export class HelixReadingPressEvent extends CustomEvent<ReadingDetail> {
  static readonly eventName = 'helix-reading-press'

  constructor(detail: ReadingDetail) {
    super(HelixReadingPressEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
