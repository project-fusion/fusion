import type { ChangeDetail } from './details.js'

/**
 * A divider is about to move, and can be refused.
 *
 * @followedBy helix-resized
 */
export class HelixBeforeResizeEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-resize'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeResizeEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
