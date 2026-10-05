import type { ChangeDetail } from './details.js'

/**
 * A pane shut or reopened.
 *
 * The notification half of `helix-before-collapse`, sent once `collapsed` has
 * moved. `detail.value` is the side that is shut, or empty where both panes
 * are open. Not cancelable: the decision was the request's.
 */
export class HelixCollapseEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-collapse'

  constructor(detail: ChangeDetail) {
    super(HelixCollapseEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
