import type { RangeDetail } from './details.js'

/**
 * The items on screen changed: a virtual list was scrolled or resized, or its
 * items changed. Carries the new range, which the list's `range` also holds.
 * Not cancelable: the list has already moved.
 */
export class HelixRangeChangeEvent extends CustomEvent<RangeDetail> {
  static readonly eventName = 'helix-range-change'

  constructor(detail: RangeDetail) {
    super(HelixRangeChangeEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
