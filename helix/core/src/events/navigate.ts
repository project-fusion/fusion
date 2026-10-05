import type { NavigateDetail } from './details.js'

/**
 * Fired when a component moves the view it is showing, rather than its value.
 *
 * A calendar paging to another month is not choosing a date, and the two have
 * to be separable: a consumer driving the view needs to hear that it moved
 * without being told the answer changed. `helix-change` belongs to the value,
 * and giving it both jobs would make either one unusable on its own.
 */
export class HelixNavigateEvent extends CustomEvent<NavigateDetail> {
  static readonly eventName = 'helix-navigate'

  constructor(detail: NavigateDetail) {
    super(HelixNavigateEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
