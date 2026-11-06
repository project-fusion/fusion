import type { CellCommitDetail } from './details.js'

/**
 * A reader is saving a cell's new value, by leaving the cell, with Enter or
 * Tab, or by toggling a boolean.
 *
 * Cancelable: cancel it to keep the old value. To check the value on your
 * server first, pass the check to `detail.waitUntil`: the cell shows that it
 * is saving until the check settles, and a message it resolves to refuses
 * the value.
 *
 * @followedBy helix-cell-commit
 */
export class HelixBeforeCellCommitEvent extends CustomEvent<CellCommitDetail> {
  static readonly eventName = 'helix-before-cell-commit'

  constructor(detail: CellCommitDetail) {
    super(HelixBeforeCellCommitEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
