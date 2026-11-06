import type { CellCommitDetail } from './details.js'

/**
 * A cell's new value was saved into its row.
 *
 * The notification after `helix-before-cell-commit`, sent when nobody refused
 * it and every check passed. `rows` already holds a copy of the row with the
 * new value. Not cancelable: the decision was the request's.
 */
export class HelixCellCommitEvent extends CustomEvent<CellCommitDetail> {
  static readonly eventName = 'helix-cell-commit'

  constructor(detail: CellCommitDetail) {
    super(HelixCellCommitEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
