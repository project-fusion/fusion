import type { ChangeDetail } from '@fusion.dev/helix-core'

/**
 * Rows are about to open or close in place, and the change can be refused: a
 * table's disclosure button was pressed. Carries every row's key that would be
 * open, separated by commas, which is what `expanded` would hold. Cancelable:
 * refusing it keeps the rows as they are.
 *
 * @followedBy helix-expand
 */
export class HelixBeforeExpandEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-expand'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeExpandEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
