import type { ChangeDetail } from './details.js'

/**
 * The divider between a sandbox's panes is about to move, and can be refused.
 *
 * Its own verb rather than a `helix-before-resize` carrying which divider moved:
 * a sandbox has two, and they were told apart by a field on a detail every other
 * request in this file also carries.
 */
export class HelixBeforeSplitEvent extends CustomEvent<ChangeDetail> {
  static readonly eventName = 'helix-before-split'

  constructor(detail: ChangeDetail) {
    super(HelixBeforeSplitEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
