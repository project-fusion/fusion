import type { DismissDetail } from './details.js'

/**
 * Fired when an element asks to be taken away.
 *
 * A request rather than a notification: the element does not remove itself,
 * because the consumer owns the markup it is in and removing the node under
 * them would put their state and the document out of step. Cancelable, so
 * `preventDefault()` is a refusal.
 *
 * One verb for both shapes. A tag leaving a list and an announcement closing
 * itself are the same act from the element's side.
 */
export class HelixDismissEvent extends CustomEvent<DismissDetail> {
  static readonly eventName = 'helix-dismiss'

  constructor(detail: DismissDetail) {
    super(HelixDismissEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
