import type { NavigateDetail } from './details.js'

/**
 * A component is about to move the view it is showing, and the move can be
 * refused.
 *
 * A calendar paging to another month is not choosing a date, and the two have
 * to be separable: a consumer driving the view needs to hear that it moved
 * without being told the answer changed. `helix-before-change` belongs to the value,
 * and giving it both jobs would make either one unusable on its own. Cancelable: refusing it keeps the view where it is.
 *
 * @followedBy helix-navigate
 */
export class HelixBeforeNavigateEvent extends CustomEvent<NavigateDetail> {
  static readonly eventName = 'helix-before-navigate'

  constructor(detail: NavigateDetail) {
    super(HelixBeforeNavigateEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
