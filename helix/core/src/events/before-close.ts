import type { OpenDetail } from './details.js'

/**
 * Fired when an element is about to close. See `HelixBeforeOpenEvent`.
 *
 * @followedBy toggle close
 */
export class HelixBeforeCloseEvent extends CustomEvent<OpenDetail> {
  static readonly eventName = 'helix-before-close'

  constructor() {
    super(HelixBeforeCloseEvent.eventName, {
      bubbles: false,
      cancelable: true,
      composed: false,
      detail: { open: false },
    })
  }
}
