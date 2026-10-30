import type { RemoveDetail } from './details.js'

/**
 * A reader asked for cards or connections to be taken away.
 *
 * A request for the reason `helix-connect` is one: the elements are the page's,
 * so the page removes them. Nothing to refuse, because nothing happens unless
 * the page acts.
 */
export class HelixRemoveEvent extends CustomEvent<RemoveDetail> {
  static readonly eventName = 'helix-remove'

  constructor(detail: RemoveDetail) {
    super(HelixRemoveEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
