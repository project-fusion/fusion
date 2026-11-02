import type { ColumnToggleDetail } from './details.js'

/**
 * A column was hidden or shown again.
 *
 * The notification after `helix-before-column-toggle`, sent when nobody refused
 * it. Not cancelable: the decision was the request's.
 */
export class HelixColumnToggleEvent extends CustomEvent<ColumnToggleDetail> {
  static readonly eventName = 'helix-column-toggle'

  constructor(detail: ColumnToggleDetail) {
    super(HelixColumnToggleEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
