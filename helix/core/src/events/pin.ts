import type { ChangeDetail } from './details.js'

/**
 * A transcript was pinned to the bottom, or let go of it.
 *
 * The notification half of `helix-before-pin`, sent once `pinned` has moved,
 * so `currentTarget.pinned` is the new state and `detail.value` says it as
 * `true` or `false`. Not cancelable: the decision was the request's.
 */
export class HelixPinEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-pin'

  constructor(detail: ChangeDetail) {
    super(HelixPinEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
