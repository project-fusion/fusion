import type { CellEditDetail } from './details.js'

/**
 * A cell opened for an edit.
 *
 * The notification after `helix-before-cell-edit`, sent when nobody refused
 * it. Not cancelable: the decision was the request's.
 */
export class HelixCellEditEvent extends CustomEvent<CellEditDetail> {
  static readonly eventName = 'helix-cell-edit'

  constructor(detail: CellEditDetail) {
    super(HelixCellEditEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
