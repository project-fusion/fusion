import type { CellEditDetail } from './details.js'

/**
 * A reader asked to edit a cell, with Enter, F2, a double click, or by typing.
 *
 * Cancelable: cancel it to keep the cell as it is, such as for a row that is
 * locked on your server.
 *
 * @followedBy helix-cell-edit
 */
export class HelixBeforeCellEditEvent extends CustomEvent<CellEditDetail> {
  static readonly eventName = 'helix-before-cell-edit'

  constructor(detail: CellEditDetail) {
    super(HelixBeforeCellEditEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
