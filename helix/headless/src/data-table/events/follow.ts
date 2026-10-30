import type { FollowDetail } from './details.js'

/**
 * A press on a link inside the component is loading its page.
 *
 * The notification after `helix-before-follow`, sent when nobody refused it,
 * with the path the browser is going to. Not cancelable: the decision was the
 * request's.
 */
export class HelixFollowEvent extends CustomEvent<FollowDetail> {
  static readonly eventName = 'helix-follow'

  constructor(detail: FollowDetail) {
    super(HelixFollowEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
