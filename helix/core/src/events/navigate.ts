import type { NavigateDetail } from './details.js'

/**
 * A component moved the view it is showing.
 *
 * The notification after `helix-before-navigate`, sent once the view has moved,
 * with where it is now. Not cancelable: the decision was the request's.
 */
export class HelixNavigateEvent extends CustomEvent<NavigateDetail> {
  static readonly eventName = 'helix-navigate'

  constructor(detail: NavigateDetail) {
    super(HelixNavigateEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
