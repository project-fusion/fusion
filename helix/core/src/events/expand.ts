import type { ChangeDetail } from './details.js'

/**
 * Rows opened or closed in place: a data table's tree of rows. Carries every
 * open row's key, separated by commas, which the table's `expanded` also
 * holds. Not cancelable: the rows have already moved.
 */
export class HelixExpandEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-expand'

  constructor(detail: ChangeDetail) {
    super(HelixExpandEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
