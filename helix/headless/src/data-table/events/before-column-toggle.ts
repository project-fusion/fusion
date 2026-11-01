import type { ColumnToggleDetail } from './details.js'

/**
 * A column is about to be hidden or shown again, from its menu or from
 * `hideColumn` or `showColumn`.
 *
 * Cancelable: cancel it to keep the column as it is, and set `hidden` on the
 * column yourself.
 *
 * @followedBy helix-column-toggle
 */
export class HelixBeforeColumnToggleEvent extends CustomEvent<ColumnToggleDetail> {
  static readonly eventName = 'helix-before-column-toggle'

  constructor(detail: ColumnToggleDetail) {
    super(HelixBeforeColumnToggleEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
